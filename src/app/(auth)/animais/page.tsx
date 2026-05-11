import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { AnimaisClient } from './animais-client';

export default async function AnimaisPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');

  const [proprietarios, classificacoes, anoRange, causasMorte] = await Promise.all([
    prisma.user.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }),
    prisma.classificacaoConfig.findMany({ select: { denominacao: true }, orderBy: { ordem: 'asc' } }),
    prisma.animal.aggregate({ _min: { eraAno: true }, _max: { eraAno: true } }),
    prisma.causaMortePredefinida.findMany({ where: { ativo: true }, orderBy: { ordem: 'asc' }, select: { nome: true } }),
  ]);

  const hoje = new Date();
  const minAno = anoRange._min.eraAno ?? hoje.getFullYear() - 5;
  const maxAno = anoRange._max.eraAno ?? hoje.getFullYear();

  return (
    <AnimaisClient
      proprietarios={proprietarios}
      denominacoes={classificacoes.map((c) => c.denominacao)}
      minAno={minAno}
      maxAno={maxAno}
      causasMorte={causasMorte.map((c) => c.nome)}
    />
  );
}
