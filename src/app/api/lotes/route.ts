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
            select: { id: true, numero: true, denominacao: true, genero: true, peso: true, status: true, proprietario: { select: { name: true } } },
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
  const { nome, dataFechamento, comprador, valorTotal, pesoTotal, notaFiscal, gta, observacoes, animalIds } = body;

  if (!nome || !Array.isArray(animalIds) || animalIds.length === 0) {
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

  const lote = await prisma.loteAnimal.create({
    data: {
      nome,
      dataFechamento: dataFechamento ? new Date(dataFechamento) : null,
      comprador: comprador || null,
      valorTotal: valorTotal ? parseFloat(valorTotal) : null,
      pesoTotal: pesoTotal ? parseFloat(pesoTotal) : null,
      notaFiscal: notaFiscal || null,
      gta: gta || null,
      observacoes: observacoes || null,
      criadoPorId: parseInt(session.user.id),
      animais: { create: animalIds.map((id: number) => ({ animalId: id })) },
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
