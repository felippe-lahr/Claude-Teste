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
  const currentYear = hoje.getFullYear();
  // Clamp to a sane range — bad imports can produce eraAno values like 176 or 1603
  const rawMin = anoRange._min.eraAno;
  const rawMax = anoRange._max.eraAno;
  const minAno = rawMin && rawMin >= 1990 && rawMin <= currentYear + 2 ? rawMin : currentYear - 5;
  const maxAno = rawMax && rawMax >= 1990 && rawMax <= currentYear + 2 ? rawMax : currentYear;

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
