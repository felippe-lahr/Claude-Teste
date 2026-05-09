import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const registro = await prisma.registroSanitario.findUnique({ where: { id: parseInt(params.id) } });
  if (!registro) return NextResponse.json({ error: 'Registro não encontrado' }, { status: 404 });

  await prisma.registroSanitario.delete({ where: { id: parseInt(params.id) } });

  return NextResponse.json({ success: true });
}
