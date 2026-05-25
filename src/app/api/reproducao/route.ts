import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { StatusReprodutivo } from '@prisma/client';
import { calcularMesParto, DEFAULT_PRENHEZ_CONFIGS } from '@/lib/prenhez';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'));
  const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') ?? '20')));
  const skip = (page - 1) * limit;

  const estacaoMontaId = searchParams.get('estacaoMontaId');
  const statusReprodutivo = searchParams.get('statusReprodutivo') as StatusReprodutivo | null;
  const proprietarioId = searchParams.get('proprietarioId');
  const toqueMes = searchParams.get('toqueMes');
  const toqueAno = searchParams.get('toqueAno');
  const excluirDescartes = searchParams.get('excluirDescartes') === 'true';

  // Build dataToque range filter when both month and year are selected
  let dataToqueFilter: { dataToque?: { gte: Date; lte: Date } } = {};
  if (toqueMes && toqueAno) {
    const m = parseInt(toqueMes) - 1;
    const y = parseInt(toqueAno);
    dataToqueFilter = {
      dataToque: {
        gte: new Date(Date.UTC(y, m, 1)),
        lte: new Date(Date.UTC(y, m + 1, 0, 23, 59, 59, 999)),
      },
    };
  }

  const animalWhere: Record<string, unknown> = {};
  if (proprietarioId) animalWhere.proprietarioId = parseInt(proprietarioId);

  const where = {
    ...dataToqueFilter,
    ...(estacaoMontaId ? { estacaoMontaId: parseInt(estacaoMontaId) } : {}),
    ...(statusReprodutivo ? { statusReprodutivo } : {}),
    ...(Object.keys(animalWhere).length > 0 ? { animal: animalWhere } : {}),
  };

  const [reproducoes, total] = await Promise.all([
    prisma.reproducaoAnimal.findMany({
      where,
      skip,
      take: limit,
      orderBy: { dataToque: 'desc' },
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

  // Projeção de nascimentos — busca todos CHEIA com estagioPrenhez + dataToque
  const cheiasList = await prisma.reproducaoAnimal.findMany({
    where: { statusReprodutivo: 'CHEIA', estagioPrenhez: { not: null }, dataToque: { not: null } },
    select: { estagioPrenhez: true, dataToque: true },
  });

  // Load prenhez configs (fall back to defaults if not seeded)
  let prenhezConfigs = DEFAULT_PRENHEZ_CONFIGS;
  try {
    const dbConfigs = await prisma.classificacaoPrenhezConfig.findMany({ orderBy: { ordem: 'asc' } });
    if (dbConfigs.length > 0) prenhezConfigs = dbConfigs;
  } catch { /* table may not exist yet during migrations */ }

  const contagemParto: Record<string, number> = {};
  const today = new Date();
  for (const r of cheiasList) {
    if (!r.estagioPrenhez || !r.dataToque) continue;
    const { mes, ano } = calcularMesParto(r.estagioPrenhez, r.dataToque);
    // Only show future births (next 6 months)
    const diffMonths = (ano - today.getUTCFullYear()) * 12 + (mes - (today.getUTCMonth() + 1));
    if (diffMonths >= 0 && diffMonths < 6) {
      const key = `${ano}-${mes}`;
      contagemParto[key] = (contagemParto[key] ?? 0) + 1;
    }
  }
  const projecao = Object.entries(contagemParto)
    .map(([key, count]) => {
      const [ano, mes] = key.split('-').map(Number);
      return { mes, ano, count };
    })
    .sort((a, b) => a.ano !== b.ano ? a.ano - b.ano : a.mes - b.mes);

  const totalFemeas = await prisma.animal.count({ where: { genero: 'FEMEA', status: 'VIVO' } });
  const cheias = await prisma.reproducaoAnimal.count({ where: { statusReprodutivo: 'CHEIA' } });
  const vazias = await prisma.reproducaoAnimal.count({ where: { statusReprodutivo: 'VAZIA' } });
  const nuncaPariuCount = await prisma.reproducaoAnimal.count({ where: { statusReprodutivo: 'VAZIA', nuncaPariu: true } });

  // Índice de prenhez — calculado apenas quando mês e ano do toque estão selecionados
  let prenhez: { percent: number; cheias: number; total: number } | null = null;
  if (toqueMes && toqueAno) {
    const animalWherePrenhez: Record<string, unknown> = {};
    if (excluirDescartes) animalWherePrenhez.descarte = false;

    const [totalTocadas, cheiasNoPeriodo] = await Promise.all([
      prisma.reproducaoAnimal.count({
        where: {
          ...dataToqueFilter,
          ...(Object.keys(animalWherePrenhez).length > 0 ? { animal: animalWherePrenhez } : {}),
        },
      }),
      prisma.reproducaoAnimal.count({
        where: {
          ...dataToqueFilter,
          statusReprodutivo: 'CHEIA',
          ...(Object.keys(animalWherePrenhez).length > 0 ? { animal: animalWherePrenhez } : {}),
        },
      }),
    ]);

    prenhez = {
      percent: totalTocadas > 0 ? Math.round((cheiasNoPeriodo / totalTocadas) * 100) : 0,
      cheias: cheiasNoPeriodo,
      total: totalTocadas,
    };
  }

  return NextResponse.json({
    reproducoes,
    total,
    pages: Math.ceil(total / limit),
    resumo: { totalFemeas, cheias, vazias, nuncaPariu: nuncaPariuCount, prenhez },
    projecao,
  });
}
