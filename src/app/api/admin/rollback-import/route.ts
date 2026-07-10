import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET  → preview: which animals would be deleted
// POST → confirm: actually delete them
// Both require an active session.

async function getLastImport() {
  return prisma.logAlteracao.findFirst({
    where: { tipo: 'IMPORTACAO' },
    orderBy: { createdAt: 'desc' },
  });
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const log = await getLastImport();
  if (!log) return NextResponse.json({ error: 'Nenhuma importação encontrada' }, { status: 404 });

  // Animals created within 2 hours before (and up to 1 min after) the import log entry
  const desde = new Date(log.createdAt.getTime() - 2 * 60 * 60 * 1000);
  const ate   = new Date(log.createdAt.getTime() + 60 * 1000);

  const animais = await prisma.animal.findMany({
    where: { createdAt: { gte: desde, lte: ate } },
    select: { id: true, numero: true, denominacao: true, createdAt: true, proprietario: { select: { name: true } } },
    orderBy: { createdAt: 'asc' },
  });

  return NextResponse.json({
    importacao: {
      id: log.id,
      arquivo: log.fileName,
      data: log.createdAt,
      descricao: log.descricao,
      por: log.userName,
    },
    animaisParaDeletar: animais,
    total: animais.length,
  });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const logId: number | undefined = body.logId;

  const log = logId
    ? await prisma.logAlteracao.findUnique({ where: { id: logId } })
    : await getLastImport();

  if (!log || log.tipo !== 'IMPORTACAO') {
    return NextResponse.json({ error: 'Importação não encontrada' }, { status: 404 });
  }

  const desde = new Date(log.createdAt.getTime() - 2 * 60 * 60 * 1000);
  const ate   = new Date(log.createdAt.getTime() + 60 * 1000);

  const animais = await prisma.animal.findMany({
    where: { createdAt: { gte: desde, lte: ate } },
    select: { id: true, numero: true },
  });

  const ids = animais.map((a) => a.id);

  if (ids.length === 0) {
    return NextResponse.json({ message: 'Nenhum animal para reverter', deletados: 0 });
  }

  // Cascade delete dependent records first
  await prisma.$transaction([
    prisma.reproducaoAnimal.deleteMany({ where: { animalId: { in: ids } } }),
    prisma.registroSanitario.deleteMany({ where: { animalId: { in: ids } } }),
    prisma.morte.deleteMany({ where: { animalId: { in: ids } } }),
    prisma.animal.deleteMany({ where: { id: { in: ids } } }),
  ]);

  return NextResponse.json({
    message: `Reversão concluída: ${ids.length} animal(is) removido(s)`,
    deletados: ids.length,
    numeros: animais.map((a) => a.numero),
  });
}
