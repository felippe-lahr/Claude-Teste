import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { StatusReprodutivo } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'));
  const limit = 20;
  const skip = (page - 1) * limit;

  const estacaoMontaId = searchParams.get('estacaoMontaId');
  const statusReprodutivo = searchParams.get('statusReprodutivo') as StatusReprodutivo | null;
  const proprietarioId = searchParams.get('proprietarioId');

  const where = {
    ...(estacaoMontaId ? { estacaoMontaId: parseInt(estacaoMontaId) } : {}),
    ...(statusReprodutivo ? { statusReprodutivo } : {}),
    ...(proprietarioId ? { animal: { proprietarioId: parseInt(proprietarioId) } } : {}),
  };

  const [reproducoes, total] = await Promise.all([
    prisma.reproducaoAnimal.findMany({
      where,
      skip,
      take: limit,
      orderBy: { updatedAt: 'desc' },
      include: {
        animal: {
          select: {
            id: true,
            numero: true,
            denominacao: true,
            proprietario: { select: { id: true, name: true } },
          },
        },
        estacaoMonta: true,
        semen: true,
      },
    }),
    prisma.reproducaoAnimal.count({ where }),
  ]);

  const totalFemeas = await prisma.animal.count({ where: { genero: 'FEMEA', status: 'VIVO' } });
  const cheias = await prisma.reproducaoAnimal.count({ where: { statusReprodutivo: 'CHEIA' } });
  const vazias = await prisma.reproducaoAnimal.count({ where: { statusReprodutivo: 'VAZIA' } });
  const nuncaPariuCount = await prisma.reproducaoAnimal.count({ where: { statusReprodutivo: 'VAZIA', nuncaPariu: true } });

  return NextResponse.json({
    reproducoes,
    total,
    pages: Math.ceil(total / limit),
    resumo: { totalFemeas, cheias, vazias, nuncaPariu: nuncaPariuCount },
  });
}
