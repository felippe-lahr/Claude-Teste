import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { AnimaisClient } from './animais-client';

export default async function AnimaisPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');

  const proprietarios = await prisma.user.findMany({
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  });

  const classificacoes = await prisma.classificacaoConfig.findMany({
    select: { denominacao: true },
    orderBy: { ordem: 'asc' },
  });

  return (
    <AnimaisClient
      proprietarios={proprietarios}
      denominacoes={classificacoes.map((c) => c.denominacao)}
    />
  );
}
