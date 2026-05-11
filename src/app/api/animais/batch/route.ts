import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { parseDateBR } from '@/lib/utils';

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

  if (action === 'delete') {
    await prisma.animal.deleteMany({ where: { id: { in: ids } } });
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
    const registradoPorId = parseInt(session.user.id);

    // Upsert morte record for each animal (skip if date is invalid)
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

  return NextResponse.json({ ok: true, count: ids.length });
}
