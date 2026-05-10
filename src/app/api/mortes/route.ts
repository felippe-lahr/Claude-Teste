import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { parseDateBR } from '@/lib/utils';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const page = parseInt(searchParams.get('page') ?? '1');
  const limit = parseInt(searchParams.get('limit') ?? '20');
  const skip = (page - 1) * limit;

  const [mortes, total] = await Promise.all([
    prisma.morte.findMany({
      include: {
        animal: {
          include: { proprietario: { select: { id: true, name: true } } },
        },
        registradoPor: { select: { id: true, name: true } },
      },
      orderBy: { dataObito: 'desc' },
      skip,
      take: limit,
    }),
    prisma.morte.count(),
  ]);

  const agora = new Date();
  const inicioAno = new Date(agora.getFullYear(), 0, 1);
  const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1);

  const [mortesAno, mortesMes] = await Promise.all([
    prisma.morte.count({ where: { dataObito: { gte: inicioAno } } }),
    prisma.morte.count({ where: { dataObito: { gte: inicioMes } } }),
  ]);

  return NextResponse.json({ mortes, total, mortesAno, mortesMes, page, limit, pages: Math.ceil(total / limit) });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const body = await req.json();
  const { animalId, dataObito, causa, observacoes } = body;

  if (!animalId || !dataObito) {
    return NextResponse.json({ error: 'Animal e data do óbito são obrigatórios' }, { status: 400 });
  }

  const animal = await prisma.animal.findUnique({ where: { id: parseInt(animalId) } });
  if (!animal) return NextResponse.json({ error: 'Animal não encontrado' }, { status: 404 });
  if (animal.status === 'MORTO') return NextResponse.json({ error: 'Animal já está registrado como morto' }, { status: 400 });

  const [morte] = await prisma.$transaction([
    prisma.morte.create({
      data: {
        animalId: parseInt(animalId),
        dataObito: parseDateBR(dataObito) ?? new Date(dataObito),
        causa: causa || null,
        observacoes: observacoes || null,
        registradoPorId: parseInt(session.user.id),
      },
      include: {
        animal: { include: { proprietario: { select: { id: true, name: true } } } },
        registradoPor: { select: { id: true, name: true } },
      },
    }),
    prisma.animal.update({
      where: { id: parseInt(animalId) },
      data: { status: 'MORTO' },
    }),
  ]);

  return NextResponse.json(morte, { status: 201 });
}
