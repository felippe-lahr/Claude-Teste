import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { classificarAnimal } from '@/lib/classificacao';
import { Genero, StatusAnimal, StatusReprodutivo } from '@prisma/client';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const animal = await prisma.animal.findUnique({
    where: { id: parseInt(params.id) },
    include: {
      proprietario: { select: { id: true, name: true } },
      morte: true,
      registrosSanitarios: { orderBy: { data: 'desc' } },
      reproducao: true,
    },
  });

  if (!animal) return NextResponse.json({ error: 'Animal não encontrado' }, { status: 404 });

  return NextResponse.json(animal);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const body = await req.json();
  const { numero, genero, eraMes, eraAno, peso, reprodutor, status, observacoes, proprietarioId, dataVenda, vacinas, dataObito, causaMorte, reproducao } = body;

  const denominacao = await classificarAnimal({
    genero: genero as Genero,
    eraMes: eraMes ? parseInt(eraMes) : null,
    eraAno: eraAno ? parseInt(eraAno) : null,
    reprodutor: reprodutor ?? false,
  });

  const animal = await prisma.animal.update({
    where: { id: parseInt(params.id) },
    data: {
      numero: numero || null,
      genero: genero as Genero,
      eraMes: eraMes ? parseInt(eraMes) : null,
      eraAno: eraAno ? parseInt(eraAno) : null,
      peso: peso !== undefined && peso !== '' ? parseFloat(peso) : null,
      reprodutor: reprodutor ?? false,
      status: status as StatusAnimal,
      denominacao,
      observacoes: observacoes || null,
      dataVenda: dataVenda ? new Date(dataVenda) : null,
      proprietarioId: parseInt(proprietarioId),
    },
    include: {
      proprietario: { select: { id: true, name: true } },
      morte: true,
      registrosSanitarios: { orderBy: { data: 'desc' } },
    },
  });

  // Create Morte record if status changed to MORTO and none exists yet
  if (status === 'MORTO' && !animal.morte) {
    await prisma.morte.create({
      data: {
        animalId: animal.id,
        dataObito: dataObito ? new Date(dataObito) : new Date(),
        causa: causaMorte && causaMorte !== '__outra__' ? causaMorte : null,
        registradoPorId: parseInt(session.user.id),
      },
    });
  }

  if (Array.isArray(vacinas) && vacinas.length > 0) {
    await prisma.registroSanitario.createMany({
      data: vacinas
        .filter((v: { produto?: string; data?: string }) => v.produto && v.data)
        .map((v: { produto: string; data: string; dose?: string }) => ({
          animalId: animal.id,
          tipo: 'VACINA' as const,
          produto: v.produto,
          data: new Date(v.data),
          dose: v.dose || null,
        })),
    });
  }

  if (genero === 'FEMEA' && reproducao) {
    const { statusReprodutivo, dataToque, inseminada, dataInseminacao, semenId, observacoesRepro } = reproducao;

    let estacaoMontaId: number | null = null;
    if (dataToque) {
      const dt = new Date(dataToque);
      const estacao = await prisma.estacaoMonta.findFirst({
        where: { ativo: true, dataInicio: { lte: dt }, dataFim: { gte: dt } },
      });
      estacaoMontaId = estacao?.id ?? null;
    }

    const reproData = {
      statusReprodutivo: statusReprodutivo as StatusReprodutivo | null ?? null,
      dataToque: dataToque ? new Date(dataToque) : null,
      estacaoMontaId,
      inseminada: inseminada ?? false,
      dataInseminacao: dataInseminacao ? new Date(dataInseminacao) : null,
      semenId: semenId ? parseInt(semenId) : null,
      observacoes: observacoesRepro ?? null,
      registradoPorId: parseInt(session.user.id),
    };

    await prisma.reproducaoAnimal.upsert({
      where: { animalId: parseInt(params.id) },
      update: reproData,
      create: { animalId: parseInt(params.id), ...reproData },
    });
  }

  return NextResponse.json(animal);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  if (session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }

  await prisma.animal.delete({ where: { id: parseInt(params.id) } });

  return NextResponse.json({ success: true });
}
