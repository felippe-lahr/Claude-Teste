import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const semens = await prisma.semen.findMany({
    where: { ativo: true },
    orderBy: { ordem: 'asc' },
  });

  return NextResponse.json(semens);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  if (session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });

  const { codigo, touro } = await req.json();
  if (!codigo) return NextResponse.json({ error: 'Código obrigatório' }, { status: 400 });

  const semen = await prisma.semen.create({
    data: { codigo, touro: touro || null },
  });

  return NextResponse.json(semen, { status: 201 });
}
