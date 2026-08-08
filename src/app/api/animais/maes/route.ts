import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * Busca fêmeas vivas candidatas a mãe, com o próximo número sugerido para a cria.
 * Formato do número sugerido: "<numero da mãe>/<sequência>" (ex.: 045/1, 045/2).
 * Query params: q (filtro por número), excludeId (não pode ser a própria mãe).
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const q = searchParams.get('q')?.trim();
  const excludeId = searchParams.get('excludeId');

  const where: Record<string, unknown> = { genero: 'FEMEA', status: 'VIVO' };
  if (q) where.numero = { contains: q, mode: 'insensitive' };
  if (excludeId) where.id = { not: parseInt(excludeId) };

  const maes = await prisma.animal.findMany({
    where,
    select: {
      id: true,
      numero: true,
      denominacao: true,
      proprietarioId: true,
      proprietario: { select: { name: true } },
      _count: { select: { crias: true } },
    },
    orderBy: { numero: 'asc' },
    take: 20,
  });

  const result = maes.map((m) => ({
    id: m.id,
    numero: m.numero,
    denominacao: m.denominacao,
    proprietarioId: m.proprietarioId,
    proprietarioNome: m.proprietario?.name ?? '',
    criasCount: m._count.crias,
    proximoNumero: m.numero ? `${m.numero}/${m._count.crias + 1}` : null,
  }));

  return NextResponse.json(result);
}
