import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { registrarLog } from '@/lib/log';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const status = searchParams.get('status');

  const where: Record<string, unknown> = {};
  if (status) where.status = status;

  const lotes = await prisma.loteAnimal.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      criadoPor: { select: { name: true } },
      animais: {
        include: {
          animal: {
            select: { id: true, numero: true, denominacao: true, genero: true, peso: true, status: true, descarte: true, proprietario: { select: { id: true, name: true } } },
          },
        },
      },
    },
  });

  return NextResponse.json(lotes);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const body = await req.json();
  const { nome, dataFechamento, comprador, notaFiscal, gta, observacoes, animais: animaisData } = body;

  // animaisData: Array<{ id: number; pesoAtual?: number | null; valorUnit?: number | null }>
  // Falls back to legacy animalIds array for backward compat
  const animalItems: { id: number; pesoAtual: number | null; valorUnit: number | null }[] =
    Array.isArray(animaisData)
      ? animaisData.map((a: { id: number; pesoAtual?: number | null; valorUnit?: number | null }) => ({
          id: a.id,
          pesoAtual: a.pesoAtual ?? null,
          valorUnit: a.valorUnit ?? null,
        }))
      : (body.animalIds ?? []).map((id: number) => ({ id, pesoAtual: null, valorUnit: null }));

  const animalIds = animalItems.map((a) => a.id);

  if (!nome || animalIds.length === 0) {
    return NextResponse.json({ error: 'Nome e animais são obrigatórios' }, { status: 400 });
  }

  // Block animals already in an active lot
  const conflito = await prisma.loteAnimalItem.findFirst({
    where: {
      animalId: { in: animalIds },
      lote: { status: { in: ['ABERTO', 'EM_NEGOCIACAO'] } },
    },
    include: { animal: { select: { numero: true, denominacao: true } }, lote: { select: { nome: true } } },
  });
  if (conflito) {
    return NextResponse.json({
      error: `Animal ${conflito.animal.numero ?? conflito.animal.denominacao} já está no lote "${conflito.lote.nome}"`,
    }, { status: 409 });
  }

  // Compute totals from per-animal data
  const pesoTotal = animalItems.reduce((s, a) => s + (a.pesoAtual ?? 0), 0) || null;
  const valorTotal = animalItems.reduce((s, a) => s + (a.valorUnit ?? 0), 0) || null;

  const lote = await prisma.loteAnimal.create({
    data: {
      nome,
      dataFechamento: dataFechamento ? new Date(dataFechamento) : null,
      comprador: comprador || null,
      valorTotal,
      pesoTotal,
      notaFiscal: notaFiscal || null,
      gta: gta || null,
      observacoes: observacoes || null,
      criadoPorId: parseInt(session.user.id),
      animais: {
        create: animalItems.map((a) => ({
          animalId: a.id,
          pesoAtual: a.pesoAtual,
          valorUnit: a.valorUnit,
        })),
      },
    },
    include: {
      animais: { include: { animal: { select: { numero: true, proprietario: { select: { name: true } } } } } },
    },
  });

  await registrarLog({
    tipo: 'LOTE',
    descricao: `Lote criado: "${nome}" com ${animalIds.length} animal(is)${comprador ? ` | Comprador: ${comprador}` : ''}`,
    userId: parseInt(session.user.id),
    userName: session.user.name ?? session.user.email ?? 'Usuário',
    origem: 'Lote',
  });

  return NextResponse.json(lote, { status: 201 });
}
