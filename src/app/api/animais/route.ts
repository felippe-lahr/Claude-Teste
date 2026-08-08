import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { calcularDenominacao, classificarAnimal } from '@/lib/classificacao';
import { registrarLog } from '@/lib/log';
import { registrarPartoNaMae } from '@/lib/parto';
import { Genero, StatusAnimal, StatusReprodutivo } from '@prisma/client';
import { parseDateBR } from '@/lib/utils';

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
  const denominacoesParam = searchParams.get('denominacoes');
  if (denominacoesParam) {
    const list = denominacoesParam.split(',').map(s => s.trim()).filter(Boolean);
    if (list.length === 1) where.denominacao = list[0];
    else if (list.length > 1) where.denominacao = { in: list };
  } else if (denominacao) {
    where.denominacao = denominacao;
  }

  const status = searchParams.get('status');
  if (status && (['VIVO', 'MORTO', 'VENDIDO'] as string[]).includes(status)) where.status = status as StatusAnimal;

  const descarteFilter = searchParams.get('descarte');
  if (descarteFilter === 'true') where.descarte = true;
  else if (descarteFilter === 'false') where.descarte = false;

  const eraMes = searchParams.get('eraMes');
  if (eraMes) where.eraMes = parseInt(eraMes);

  const eraAno = searchParams.get('eraAno');
  if (eraAno) where.eraAno = parseInt(eraAno);

  const eraMin = searchParams.get('eraMin');
  const eraMax = searchParams.get('eraMax');
  if (eraMin && eraMax) {
    const minIdx = parseInt(eraMin); // year*12 + (month-1)
    const maxIdx = parseInt(eraMax);
    const minYear = Math.floor(minIdx / 12);
    const minMonth = (minIdx % 12) + 1;
    const maxYear = Math.floor(maxIdx / 12);
    const maxMonth = (maxIdx % 12) + 1;
    (where as Record<string, unknown>).AND = [
      { eraAno: { not: null } },
      { OR: [{ eraAno: { gt: minYear } }, { AND: [{ eraAno: minYear }, { OR: [{ eraMes: null }, { eraMes: { gte: minMonth } }] }] }] },
      { OR: [{ eraAno: { lt: maxYear } }, { AND: [{ eraAno: maxYear }, { OR: [{ eraMes: null }, { eraMes: { lte: maxMonth } }] }] }] },
    ];
  }

  const [animais, total, regras] = await Promise.all([
    prisma.animal.findMany({
      where,
      include: {
        proprietario: { select: { id: true, name: true } },
        reproducoes: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { statusReprodutivo: true, estagioPrenhez: true, dataToque: true },
        },
      },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      skip,
      take: limit,
    }),
    prisma.animal.count({ where }),
    prisma.classificacaoConfig.findMany({ orderBy: { ordem: 'asc' } }),
  ]);

  // Recalculate classification for each animal and update those that changed
  const desatualizados = animais.filter((a) => {
    const esperado = calcularDenominacao(a.genero, a.eraMes, a.eraAno, a.reprodutor, regras);
    return a.denominacao !== esperado;
  });
  if (desatualizados.length > 0) {
    await Promise.all(
      desatualizados.map((a) =>
        prisma.animal.update({
          where: { id: a.id },
          data: { denominacao: calcularDenominacao(a.genero, a.eraMes, a.eraAno, a.reprodutor, regras) },
        }),
      ),
    );
    desatualizados.forEach((a) => {
      a.denominacao = calcularDenominacao(a.genero, a.eraMes, a.eraAno, a.reprodutor, regras);
    });
  }

  return NextResponse.json({ animais, total, page, limit, pages: Math.ceil(total / limit) });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const body = await req.json();
  const { numero, genero, eraMes, eraAno, peso, reprodutor, descarte, status, observacoes, proprietarioId, dataVenda, maeId, vacinas, reproducao } = body;

  if (!genero || !proprietarioId) {
    return NextResponse.json({ error: 'Campos obrigatórios faltando' }, { status: 400 });
  }

  // Block global duplicate number
  if (numero) {
    const existing = await prisma.animal.findFirst({ where: { numero: { equals: String(numero).trim(), mode: 'insensitive' } } });
    if (existing) return NextResponse.json({ error: `Animal nº "${numero}" já existe no sistema` }, { status: 409 });
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
      descarte: descarte ?? false,
      status: (status as StatusAnimal) ?? 'VIVO',
      denominacao,
      observacoes: observacoes || null,
      dataVenda: dataVenda ? (parseDateBR(dataVenda) ?? new Date(dataVenda)) : null,
      proprietarioId: parseInt(proprietarioId),
      maeId: maeId ? parseInt(maeId) : null,
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
          data: parseDateBR(v.data) ?? new Date(v.data),
          dose: v.dose || null,
        })),
    });
  }

  if (genero === 'FEMEA' && reproducao) {
    const { statusReprodutivo, dataToque, inseminada, dataInseminacao, semenId, montaNatural, dataMontaNatural, observacoesRepro } = reproducao;
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
          animalId: animal.id,
          statusReprodutivo: (statusReprodutivo as StatusReprodutivo) ?? null,
          dataToque: dataToque ? (parseDateBR(dataToque) ?? new Date(dataToque)) : null,
          estacaoMontaId,
          inseminada: inseminada ?? false,
          dataInseminacao: dataInseminacao ? (parseDateBR(dataInseminacao) ?? new Date(dataInseminacao)) : null,
          semenId: semenId ? parseInt(semenId) : null,
          montaNatural: montaNatural ?? false,
          dataMontaNatural: dataMontaNatural ? (parseDateBR(dataMontaNatural) ?? new Date(dataMontaNatural)) : null,
          observacoes: observacoesRepro ?? null,
          registradoPorId: parseInt(session.user.id),
        },
      });
    }
  }

  // Parto automático na mãe: o nascimento da cria (mês/ano) vira o último parto da mãe
  if (maeId && eraMes && eraAno) {
    const registrado = await registrarPartoNaMae({
      maeId: parseInt(maeId),
      criaMes: parseInt(eraMes),
      criaAno: parseInt(eraAno),
      criaNumero: animal.numero,
      userId: parseInt(session.user.id),
    });
    if (registrado) {
      await registrarLog({
        tipo: 'REPRODUCAO',
        descricao: `Parto registrado automaticamente: ${parseInt(eraMes)}/${parseInt(eraAno)} (nascimento da cria${animal.numero ? ` nº ${animal.numero}` : ''})`,
        userId: parseInt(session.user.id),
        userName: session.user.name ?? session.user.email ?? 'Usuário',
        animalId: parseInt(maeId),
      });
    }
  }

  const proprietarioNome = animal.proprietario.name;
  await registrarLog({
    tipo: 'CADASTRO',
    descricao: `Animal cadastrado: ${denominacao}, ${animal.genero === 'MACHO' ? 'Macho' : 'Fêmea'}, Status: ${animal.status}`,
    userId: parseInt(session.user.id),
    userName: session.user.name ?? session.user.email ?? 'Usuário',
    animalId: animal.id,
    animalNumero: animal.numero,
    proprietario: proprietarioNome,
  });

  return NextResponse.json(animal, { status: 201 });
}
