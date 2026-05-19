import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { ConfiguracoesClient } from './configuracoes-client';
import { prisma } from '@/lib/prisma';

export default async function ConfiguracoesPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');
  if (session.user.role !== 'ADMIN') redirect('/dashboard');

  const DEFAULT_PRENHEZ_SEEDS = [
    { estagio: 'P1', label: 'P1 (0–3 meses)', mesInicio: 0, mesFim: 2, ordem: 0 },
    { estagio: 'P2', label: 'P2 (4–6 meses)', mesInicio: 3, mesFim: 5, ordem: 1 },
    { estagio: 'P3', label: 'P3 (7–9 meses)', mesInicio: 6, mesFim: 8, ordem: 2 },
  ];

  const [ticker, classificacoes, usuarios, causasMorte, estacoes, semens, configsPrenhezRaw] = await Promise.all([
    prisma.configGlobal.findMany({ where: { chave: { in: ['boi_gordo','vaca_gorda','bezerro_8m','garrote_18m'] } } }),
    prisma.classificacaoConfig.findMany({ orderBy: { ordem: 'asc' } }),
    prisma.user.findMany({ select: { id: true, name: true, email: true, role: true }, orderBy: { name: 'asc' } }),
    prisma.causaMortePredefinida.findMany({ where: { ativo: true }, orderBy: { ordem: 'asc' } }),
    prisma.estacaoMonta.findMany({ where: { ativo: true }, orderBy: { dataInicio: 'desc' } }),
    prisma.semen.findMany({ where: { ativo: true }, orderBy: { ordem: 'asc' } }),
    prisma.classificacaoPrenhezConfig.findMany({ orderBy: { ordem: 'asc' } }),
  ]);

  // Seed default prenhez configs if none exist
  let configsPrenhez = configsPrenhezRaw;
  if (configsPrenhez.length === 0) {
    await prisma.classificacaoPrenhezConfig.createMany({ data: DEFAULT_PRENHEZ_SEEDS });
    configsPrenhez = await prisma.classificacaoPrenhezConfig.findMany({ orderBy: { ordem: 'asc' } });
  }

  const tickerMap: Record<string, string> = {};
  for (const t of ticker) tickerMap[t.chave] = t.valor;

  return <ConfiguracoesClient ticker={tickerMap} classificacoes={classificacoes} usuarios={usuarios} causasMorte={causasMorte} estacoes={estacoes} semens={semens} configsPrenhez={configsPrenhez} />;
}
