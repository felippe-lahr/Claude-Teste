import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { parseDateBR } from '@/lib/utils';
import { registrarLog } from '@/lib/log';

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const body = await req.json();
  const { ids, action, status, dataObito, causaMorte, dataVenda } = body as {
    ids: number[];
    action?: string;
    status?: 'VIVO' | 'MORTO' | 'VENDIDO';
    dataObito?: string;
    causaMorte?: string;
    dataVenda?: string;
  };

  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: 'Nenhum animal selecionado' }, { status: 400 });
  }

  const userId = parseInt(session.user.id);
  const userName = session.user.name ?? session.user.email ?? 'Usuário';

  try {
    const animais = await prisma.animal.findMany({
      where: { id: { in: ids } },
      select: { id: true, numero: true, proprietario: { select: { name: true } } },
    });

    if (action === 'delete') {
      await prisma.animal.deleteMany({ where: { id: { in: ids } } });

      await prisma.logAlteracao.createMany({
        data: animais.map((a) => ({
          tipo: 'EXCLUSAO',
          descricao: `Excluído em lote`,
          userId,
          userName,
          animalId: a.id,
          animalNumero: a.numero,
          proprietario: a.proprietario.name,
          origem: 'Lote',
        })),
      });

      return NextResponse.json({ ok: true, count: ids.length });
    }

    if (!status) return NextResponse.json({ error: 'Status obrigatório' }, { status: 400 });

    await prisma.animal.updateMany({
      where: { id: { in: ids } },
      data: {
        status,
        dataVenda: status === 'VENDIDO' && dataVenda
          ? (parseDateBR(dataVenda) ?? new Date(dataVenda))
          : status !== 'VENDIDO' ? null : undefined,
      },
    });

    if (status === 'MORTO' && dataObito) {
      const dtObito = parseDateBR(dataObito) ?? new Date(dataObito);
      const registradoPorId = userId;
      if (!isNaN(dtObito.getTime())) {
        for (const animalId of ids) {
          await prisma.morte.upsert({
            where: { animalId },
            update: { dataObito: dtObito, causa: causaMorte || null, registradoPorId },
            create: { animalId, dataObito: dtObito, causa: causaMorte || null, registradoPorId },
          });
        }
      }
    }

    const descricaoLote = status === 'MORTO'
      ? `Status → MORTO${causaMorte ? ` | Causa: ${causaMorte}` : ''}${dataObito ? ` | Óbito: ${dataObito}` : ''}`
      : status === 'VENDIDO'
      ? `Status → VENDIDO${dataVenda ? ` | Data venda: ${dataVenda}` : ''}`
      : `Status → ${status}`;

    await prisma.logAlteracao.createMany({
      data: animais.map((a) => ({
        tipo: 'LOTE',
        descricao: descricaoLote,
        userId,
        userName,
        animalId: a.id,
        animalNumero: a.numero,
        proprietario: a.proprietario.name,
        origem: 'Lote',
      })),
    });

    return NextResponse.json({ ok: true, count: ids.length });
  } catch (e) {
    console.error('Batch operation error:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Erro na operação em lote' },
      { status: 500 }
    );
  }
}
