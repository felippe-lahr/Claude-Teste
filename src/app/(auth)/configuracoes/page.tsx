import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { ConfiguracoesClient } from './configuracoes-client';
import { prisma } from '@/lib/prisma';

export default async function ConfiguracoesPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');
  if (session.user.role !== 'ADMIN') redirect('/dashboard');

  const [ticker, classificacoes, usuarios, causasMorte, estacoes, semens] = await Promise.all([
    prisma.configGlobal.findMany({ where: { chave: { in: ['boi_gordo','vaca_gorda','bezerro_8m','garrote_18m'] } } }),
    prisma.classificacaoConfig.findMany({ orderBy: { ordem: 'asc' } }),
    prisma.user.findMany({ select: { id: true, name: true, email: true, role: true }, orderBy: { name: 'asc' } }),
    prisma.causaMortePredefinida.findMany({ where: { ativo: true }, orderBy: { ordem: 'asc' } }),
    prisma.estacaoMonta.findMany({ where: { ativo: true }, orderBy: { dataInicio: 'desc' } }),
    prisma.semen.findMany({ where: { ativo: true }, orderBy: { ordem: 'asc' } }),
  ]);

  const tickerMap: Record<string, string> = {};
  for (const t of ticker) tickerMap[t.chave] = t.valor;

  return <ConfiguracoesClient ticker={tickerMap} classificacoes={classificacoes} usuarios={usuarios} causasMorte={causasMorte} estacoes={estacoes} semens={semens} />;
}
