import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const estacoes = await prisma.estacaoMonta.findMany({
    where: { ativo: true },
    orderBy: { dataInicio: 'desc' },
  });

  return NextResponse.json(estacoes);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  if (session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });

  const { nome, dataInicio, dataFim } = await req.json();
  if (!nome || !dataInicio || !dataFim) {
    return NextResponse.json({ error: 'Nome, data início e data fim são obrigatórios' }, { status: 400 });
  }

  const estacao = await prisma.estacaoMonta.create({
    data: { nome, dataInicio: new Date(dataInicio), dataFim: new Date(dataFim) },
  });

  return NextResponse.json(estacao, { status: 201 });
}
