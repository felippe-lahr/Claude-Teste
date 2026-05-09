import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

const TICKER_KEYS = ['boi_gordo', 'vaca_gorda', 'bezerro_8m', 'garrote_18m'];

export async function GET() {
  const configs = await prisma.configGlobal.findMany({
    where: { chave: { in: TICKER_KEYS } },
  });

  const result: Record<string, string> = {};
  for (const c of configs) {
    result[c.chave] = c.valor;
  }

  return NextResponse.json(result);
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  if (session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });

  const body = await req.json();

  for (const key of TICKER_KEYS) {
    if (body[key] !== undefined) {
      await prisma.configGlobal.upsert({
        where: { chave: key },
        update: { valor: String(body[key]) },
        create: { chave: key, valor: String(body[key]) },
      });
    }
  }

  return NextResponse.json({ success: true });
}
