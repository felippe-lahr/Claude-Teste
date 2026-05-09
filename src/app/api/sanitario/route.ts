import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { TipoSanitario } from '@prisma/client';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const page = parseInt(searchParams.get('page') ?? '1');
  const limit = parseInt(searchParams.get('limit') ?? '20');
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};

  const animalId = searchParams.get('animalId');
  if (animalId) where.animalId = parseInt(animalId);

  const tipo = searchParams.get('tipo');
  if (tipo && (tipo === 'VACINA' || tipo === 'MEDICAMENTO')) where.tipo = tipo as TipoSanitario;

  const produto = searchParams.get('produto');
  if (produto) where.produto = { contains: produto, mode: 'insensitive' };

  const dataInicio = searchParams.get('dataInicio');
  const dataFim = searchParams.get('dataFim');
  if (dataInicio || dataFim) {
    const dataFilter: Record<string, Date> = {};
    if (dataInicio) dataFilter.gte = new Date(dataInicio);
    if (dataFim) dataFilter.lte = new Date(dataFim);
    where.data = dataFilter;
  }

  const [registros, total] = await Promise.all([
    prisma.registroSanitario.findMany({
      where,
      include: {
        animal: {
          include: { proprietario: { select: { id: true, name: true } } },
        },
      },
      orderBy: { data: 'desc' },
      skip,
      take: limit,
    }),
    prisma.registroSanitario.count({ where }),
  ]);

  return NextResponse.json({ registros, total, page, limit, pages: Math.ceil(total / limit) });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const body = await req.json();
  const { animalId, tipo, produto, data, dose, observacoes } = body;

  if (!animalId || !tipo || !produto || !data) {
    return NextResponse.json({ error: 'Campos obrigatórios faltando' }, { status: 400 });
  }

  const registro = await prisma.registroSanitario.create({
    data: {
      animalId: parseInt(animalId),
      tipo: tipo as TipoSanitario,
      produto,
      data: new Date(data),
      dose: dose || null,
      observacoes: observacoes || null,
    },
    include: {
      animal: { include: { proprietario: { select: { id: true, name: true } } } },
    },
  });

  return NextResponse.json(registro, { status: 201 });
}
