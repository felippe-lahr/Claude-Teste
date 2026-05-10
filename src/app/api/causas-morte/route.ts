import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const causas = await prisma.causaMortePredefinida.findMany({
    where: { ativo: true },
    orderBy: { ordem: 'asc' },
  });

  return NextResponse.json(causas);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  if (session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });

  const { nome } = await req.json();
  if (!nome?.trim()) return NextResponse.json({ error: 'Nome obrigatório' }, { status: 400 });

  const maxOrdem = await prisma.causaMortePredefinida.aggregate({ _max: { ordem: true } });
  const causa = await prisma.causaMortePredefinida.create({
    data: { nome: nome.trim(), ordem: (maxOrdem._max.ordem ?? 0) + 1 },
  });

  return NextResponse.json(causa, { status: 201 });
}
