import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const KEYS = ['boi_gordo', 'vaca_gorda', 'bezerro_8m', 'garrote_18m'] as const;

export async function POST(req: NextRequest) {
  // Validate secret token
  const auth = req.headers.get('authorization') ?? '';
  const token = auth.replace('Bearer ', '').trim();
  const expected = process.env.SYNC_TOKEN;

  if (!expected || token !== expected) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const body = await req.json();

  const updates: { chave: string; valor: string }[] = [];
  for (const key of KEYS) {
    if (body[key] && String(body[key]).trim()) {
      updates.push({ chave: key, valor: String(body[key]).trim() });
    }
  }

  if (updates.length === 0) {
    return NextResponse.json({ error: 'Nenhum valor recebido' }, { status: 400 });
  }

  for (const { chave, valor } of updates) {
    await prisma.configGlobal.upsert({
      where: { chave },
      update: { valor },
      create: { chave, valor },
    });
  }

  console.log(`[sync-cotacoes] ${updates.length} cotações atualizadas:`, updates.map(u => `${u.chave}=${u.valor}`).join(', '));

  return NextResponse.json({ success: true, updated: updates.length });
}
