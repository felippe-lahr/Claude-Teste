import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const [animaisVivos, porDenominacao, porProprietario, mortesTotal, mortesAno, mortesMes] = await Promise.all([
    prisma.animal.findMany({
      where: { status: 'VIVO', descarte: false },
      select: { denominacao: true, proprietarioId: true },
    }),
    prisma.animal.groupBy({
      by: ['denominacao'],
      where: { status: 'VIVO', descarte: false },
      _count: { id: true },
      orderBy: { denominacao: 'asc' },
    }),
    prisma.animal.groupBy({
      by: ['proprietarioId'],
      where: { status: 'VIVO', descarte: false },
      _count: { id: true },
    }),
    prisma.morte.count(),
    prisma.morte.count({
      where: { dataObito: { gte: new Date(new Date().getFullYear(), 0, 1) } },
    }),
    prisma.morte.count({
      where: {
        dataObito: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
      },
    }),
  ]);

  const proprietarioIds = porProprietario.map((p) => p.proprietarioId);
  const usuarios = await prisma.user.findMany({
    where: { id: { in: proprietarioIds } },
    select: { id: true, name: true },
  });

  const totalVivos = animaisVivos.length;

  const counts: Record<string, number> = {};
  for (const a of animaisVivos) {
    counts[a.denominacao] = (counts[a.denominacao] ?? 0) + 1;
  }

  const stats = {
    total: totalVivos,
    vaca: counts['Vaca'] ?? 0,
    boi: counts['Boi'] ?? 0,
    touro: counts['Touro'] ?? 0,
    novilha: counts['Novilha'] ?? 0,
    garrote: counts['Garrote'] ?? 0,
    bezerraFemea: counts['Bezerra Fêmea'] ?? 0,
    bezerroMacho: counts['Bezerro Macho'] ?? 0,
    mortesTotal,
    mortesAno,
    mortesMes,
  };

  const porDenominacaoFormatado = porDenominacao.map((d) => ({
    denominacao: d.denominacao,
    total: d._count.id,
  }));

  const porProprietarioFormatado = porProprietario.map((p) => {
    const usuario = usuarios.find((u) => u.id === p.proprietarioId);
    return {
      proprietarioId: p.proprietarioId,
      nome: usuario?.name ?? 'Desconhecido',
      total: p._count.id,
      percentual: totalVivos > 0 ? Math.round((p._count.id / totalVivos) * 100) : 0,
    };
  });

  return NextResponse.json({ stats, porDenominacao: porDenominacaoFormatado, porProprietario: porProprietarioFormatado });
}
