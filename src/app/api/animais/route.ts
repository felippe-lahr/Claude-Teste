import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { classificarAnimal } from '@/lib/classificacao';
import { Genero, StatusAnimal } from '@prisma/client';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const page = parseInt(searchParams.get('page') ?? '1');
  const limit = parseInt(searchParams.get('limit') ?? '20');
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};

  const numero = searchParams.get('numero');
  if (numero) where.numero = { contains: numero, mode: 'insensitive' };

  const proprietarioId = searchParams.get('proprietarioId');
  if (proprietarioId) where.proprietarioId = parseInt(proprietarioId);

  const genero = searchParams.get('genero');
  if (genero && (genero === 'MACHO' || genero === 'FEMEA')) where.genero = genero as Genero;

  const denominacao = searchParams.get('denominacao');
  if (denominacao) where.denominacao = denominacao;

  const status = searchParams.get('status');
  if (status && (['VIVO', 'MORTO', 'VENDIDO'] as string[]).includes(status)) where.status = status as StatusAnimal;

  const eraMes = searchParams.get('eraMes');
  if (eraMes) where.eraMes = parseInt(eraMes);

  const eraAno = searchParams.get('eraAno');
  if (eraAno) where.eraAno = parseInt(eraAno);

  const [animais, total] = await Promise.all([
    prisma.animal.findMany({
      where,
      include: { proprietario: { select: { id: true, name: true } } },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      skip,
      take: limit,
    }),
    prisma.animal.count({ where }),
  ]);

  return NextResponse.json({ animais, total, page, limit, pages: Math.ceil(total / limit) });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const body = await req.json();
  const { numero, genero, eraMes, eraAno, peso, reprodutor, status, observacoes, proprietarioId, dataVenda, vacinas } = body;

  if (!genero || !proprietarioId) {
    return NextResponse.json({ error: 'Campos obrigatórios faltando' }, { status: 400 });
  }

  const denominacao = await classificarAnimal({
    genero: genero as Genero,
    eraMes: eraMes ? parseInt(eraMes) : null,
    eraAno: eraAno ? parseInt(eraAno) : null,
    reprodutor: reprodutor ?? false,
  });

  const animal = await prisma.animal.create({
    data: {
      numero: numero || null,
      genero: genero as Genero,
      eraMes: eraMes ? parseInt(eraMes) : null,
      eraAno: eraAno ? parseInt(eraAno) : null,
      peso: peso ? parseFloat(peso) : null,
      reprodutor: reprodutor ?? false,
      status: (status as StatusAnimal) ?? 'VIVO',
      denominacao,
      observacoes: observacoes || null,
      dataVenda: dataVenda ? new Date(dataVenda) : null,
      proprietarioId: parseInt(proprietarioId),
    },
    include: { proprietario: { select: { id: true, name: true } } },
  });

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

  return NextResponse.json(animal, { status: 201 });
}
