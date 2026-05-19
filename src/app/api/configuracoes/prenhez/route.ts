import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { DEFAULT_PRENHEZ_CONFIGS } from '@/lib/prenhez';

const DEFAULT_SEEDS = [
  { estagio: 'P1', label: 'P1 (0–3 meses)', mesInicio: 0, mesFim: 2, ordem: 0 },
  { estagio: 'P2', label: 'P2 (4–6 meses)', mesInicio: 3, mesFim: 5, ordem: 1 },
  { estagio: 'P3', label: 'P3 (7–9 meses)', mesInicio: 6, mesFim: 8, ordem: 2 },
];

async function ensureSeeds() {
  const existing = await prisma.classificacaoPrenhezConfig.count();
  if (existing === 0) {
    await prisma.classificacaoPrenhezConfig.createMany({ data: DEFAULT_SEEDS });
  }
}

export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  await ensureSeeds();
  const configs = await prisma.classificacaoPrenhezConfig.findMany({ orderBy: { ordem: 'asc' } });
  return NextResponse.json(configs);
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  if (session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });

  const body = await req.json();
  if (!Array.isArray(body)) return NextResponse.json({ error: 'Body deve ser um array' }, { status: 400 });

  await Promise.all(
    body.map((item: { id: number; mesInicio: number; mesFim: number }) =>
      prisma.classificacaoPrenhezConfig.update({
        where: { id: item.id },
        data: { mesInicio: item.mesInicio, mesFim: item.mesFim },
      }),
    ),
  );

  const updated = await prisma.classificacaoPrenhezConfig.findMany({ orderBy: { ordem: 'asc' } });
  return NextResponse.json(updated);
}
