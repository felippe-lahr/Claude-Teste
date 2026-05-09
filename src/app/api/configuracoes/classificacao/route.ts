import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { classificarAnimal } from '@/lib/classificacao';
import { Genero } from '@prisma/client';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const regras = await prisma.classificacaoConfig.findMany({ orderBy: { ordem: 'asc' } });
  return NextResponse.json(regras);
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  if (session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });

  const body: Array<{
    id: number;
    denominacao: string;
    genero: Genero;
    idadeMinMeses: number;
    idadeMaxMeses: number | null;
    ordem: number;
  }> = await req.json();

  for (const r of body) {
    await prisma.classificacaoConfig.update({
      where: { id: r.id },
      data: {
        idadeMinMeses: r.idadeMinMeses,
        idadeMaxMeses: r.idadeMaxMeses ?? null,
      },
    });
  }

  // Recalcular denominação de todos os animais vivos
  const animaisVivos = await prisma.animal.findMany({
    where: { status: 'VIVO' },
    select: { id: true, genero: true, eraMes: true, eraAno: true, reprodutor: true },
  });

  for (const animal of animaisVivos) {
    const denominacao = await classificarAnimal({
      genero: animal.genero as Genero,
      eraMes: animal.eraMes,
      eraAno: animal.eraAno,
      reprodutor: animal.reprodutor,
    });
    await prisma.animal.update({ where: { id: animal.id }, data: { denominacao } });
  }

  return NextResponse.json({ success: true, recalculados: animaisVivos.length });
}
