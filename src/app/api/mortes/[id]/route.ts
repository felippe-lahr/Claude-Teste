import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  if (session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }

  const morte = await prisma.morte.findUnique({ where: { id: parseInt(params.id) } });
  if (!morte) return NextResponse.json({ error: 'Registro não encontrado' }, { status: 404 });

  await prisma.$transaction([
    prisma.morte.delete({ where: { id: parseInt(params.id) } }),
    prisma.animal.update({ where: { id: morte.animalId }, data: { status: 'VIVO' } }),
  ]);

  return NextResponse.json({ success: true });
}
