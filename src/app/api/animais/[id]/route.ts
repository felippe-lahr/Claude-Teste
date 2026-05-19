import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { classificarAnimal } from '@/lib/classificacao';
import { EstagioPrenhez, Genero, StatusAnimal, StatusReprodutivo } from '@prisma/client';
import { parseDateBR } from '@/lib/utils';
import { registrarLog } from '@/lib/log';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const animal = await prisma.animal.findUnique({
    where: { id: parseInt(params.id) },
    include: {
      proprietario: { select: { id: true, name: true } },
      morte: true,
      registrosSanitarios: { orderBy: { data: 'desc' } },
      reproducoes: {
        orderBy: { createdAt: 'desc' },
        include: { estacaoMonta: true, semen: true },
      },
      loteItems: {
        include: { lote: { select: { nome: true, status: true, comprador: true, dataFechamento: true } } },
        take: 1,
        orderBy: { id: 'desc' },
      },
    },
  });

  if (!animal) return NextResponse.json({ error: 'Animal não encontrado' }, { status: 404 });

  return NextResponse.json(animal);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const body = await req.json();
  const { numero, genero, eraMes, eraAno, peso, reprodutor, descarte, status, observacoes, proprietarioId, dataVenda, vacinas, dataObito, causaMorte, reproducao } = body;

  // Block changing to a number that already exists on another animal
  if (numero) {
    const conflict = await prisma.animal.findFirst({
      where: { numero: { equals: String(numero).trim(), mode: 'insensitive' }, id: { not: parseInt(params.id) } },
    });
    if (conflict) return NextResponse.json({ error: `Animal nº "${numero}" já existe no sistema` }, { status: 409 });
  }

  // Fetch before state for change description
  const before = await prisma.animal.findUnique({
    where: { id: parseInt(params.id) },
    include: { proprietario: { select: { name: true } } },
  });

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
      descarte: descarte ?? false,
      status: status as StatusAnimal,
      denominacao,
      observacoes: observacoes || null,
      dataVenda: dataVenda ? (parseDateBR(dataVenda) ?? new Date(dataVenda)) : null,
      proprietarioId: parseInt(proprietarioId),
    },
    include: {
      proprietario: { select: { id: true, name: true } },
      morte: true,
      registrosSanitarios: { orderBy: { data: 'desc' } },
    },
  });

  if (status === 'MORTO' && !animal.morte) {
    await prisma.morte.create({
      data: {
        animalId: animal.id,
        dataObito: dataObito ? (parseDateBR(dataObito) ?? new Date(dataObito)) : new Date(),
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
          data: parseDateBR(v.data) ?? new Date(v.data),
          dose: v.dose || null,
        })),
    });
  }

  if (genero === 'FEMEA' && reproducao) {
    const { statusReprodutivo, estagioPrenhez, dataToque, inseminada, dataInseminacao, semenId, montaNatural, dataMontaNatural, ultimoPartoMes, ultimoPartoAno, nuncaPariu, observacoesRepro } = reproducao;
    if (statusReprodutivo || dataToque || dataMontaNatural) {
      let estacaoMontaId: number | null = null;
      const refDate = dataToque ?? dataMontaNatural;
      if (refDate) {
        const dt = parseDateBR(refDate) ?? new Date(refDate);
        const estacao = await prisma.estacaoMonta.findFirst({
          where: { ativo: true, dataInicio: { lte: dt }, dataFim: { gte: dt } },
        });
        estacaoMontaId = estacao?.id ?? null;
      }

      await prisma.reproducaoAnimal.create({
        data: {
          animalId: parseInt(params.id),
          statusReprodutivo: statusReprodutivo as StatusReprodutivo | null ?? null,
          estagioPrenhez: statusReprodutivo === 'CHEIA' && estagioPrenhez ? (estagioPrenhez as EstagioPrenhez) : null,
          dataToque: dataToque ? (parseDateBR(dataToque) ?? new Date(dataToque)) : null,
          estacaoMontaId,
          inseminada: inseminada ?? false,
          dataInseminacao: dataInseminacao ? (parseDateBR(dataInseminacao) ?? new Date(dataInseminacao)) : null,
          semenId: semenId ? parseInt(semenId) : null,
          montaNatural: montaNatural ?? false,
          dataMontaNatural: dataMontaNatural ? (parseDateBR(dataMontaNatural) ?? new Date(dataMontaNatural)) : null,
          ultimoPartoMes: ultimoPartoMes ? parseInt(ultimoPartoMes) : null,
          ultimoPartoAno: ultimoPartoAno ? parseInt(ultimoPartoAno) : null,
          nuncaPariu: nuncaPariu ?? false,
          observacoes: observacoesRepro ?? null,
          registradoPorId: parseInt(session.user.id),
        },
      });

      await registrarLog({
        tipo: 'REPRODUCAO',
        descricao: `Status reprodutivo: ${statusReprodutivo ?? '—'}${nuncaPariu ? ' | Nunca pariu' : ''}${ultimoPartoMes && ultimoPartoAno ? ` | Último parto: ${ultimoPartoMes}/${ultimoPartoAno}` : ''}${dataToque ? ` | Toque: ${dataToque}` : ''}${inseminada ? ' | Inseminada: Sim' : ''}`,
        userId: parseInt(session.user.id),
        userName: session.user.name ?? session.user.email ?? 'Usuário',
        animalId: animal.id,
        animalNumero: animal.numero,
        proprietario: animal.proprietario.name,
      });
    }
  }

  // Build change description from diff
  const changes: string[] = [];
  if (before) {
    if (before.status !== status) changes.push(`Status: ${before.status} → ${status}`);
    if (before.descarte !== (descarte ?? false)) changes.push(`Descarte: ${before.descarte ? 'Sim' : 'Não'} → ${(descarte ?? false) ? 'Sim' : 'Não'}`);
    if (before.peso !== (peso !== undefined && peso !== '' ? parseFloat(peso) : null)) changes.push(`Peso: ${before.peso ?? '—'} → ${peso || '—'} kg`);
    if (before.denominacao !== denominacao) changes.push(`Denominação: ${before.denominacao} → ${denominacao}`);
    if ((before.numero ?? '') !== (numero || '')) changes.push(`Número: ${before.numero ?? '—'} → ${numero || '—'}`);
  }

  await registrarLog({
    tipo: 'EDICAO',
    descricao: changes.length > 0 ? changes.join(' | ') : 'Dados atualizados',
    userId: parseInt(session.user.id),
    userName: session.user.name ?? session.user.email ?? 'Usuário',
    animalId: animal.id,
    animalNumero: animal.numero,
    proprietario: animal.proprietario.name,
  });

  return NextResponse.json(animal);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  if (session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }

  const animal = await prisma.animal.findUnique({
    where: { id: parseInt(params.id) },
    include: { proprietario: { select: { name: true } } },
  });

  await registrarLog({
    tipo: 'EXCLUSAO',
    descricao: `Animal excluído: ${animal?.denominacao ?? ''}, ${animal?.genero === 'MACHO' ? 'Macho' : 'Fêmea'}`,
    userId: parseInt(session.user.id),
    userName: session.user.name ?? session.user.email ?? 'Usuário',
    animalId: parseInt(params.id),
    animalNumero: animal?.numero,
    proprietario: animal?.proprietario.name,
  });

  await prisma.animal.delete({ where: { id: parseInt(params.id) } });

  return NextResponse.json({ success: true });
}
