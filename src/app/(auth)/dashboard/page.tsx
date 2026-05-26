import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { StatCard } from '@/components/ui/stat-card';
import { DashboardCharts } from '@/components/dashboard/dashboard-charts';
import {
  Beef,
  Settings,
  Upload,
  Skull,
  Syringe,
} from 'lucide-react';
import Link from 'next/link';

const MESES_PT_DASH = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

type RegraClass = { genero: string; idadeMinMeses: number; idadeMaxMeses: number | null; denominacao: string };

function classEmMes(
  genero: 'MACHO' | 'FEMEA',
  eraMes: number | null,
  eraAno: number | null,
  reprodutor: boolean,
  regras: RegraClass[],
  refAno: number,
  refMes: number,
): string {
  if (genero === 'MACHO' && reprodutor) return 'Touro';
  if (eraAno == null) return genero === 'MACHO' ? 'Boi' : 'Vaca';
  const meses = (refAno - eraAno) * 12 + (refMes - (eraMes ?? 1));
  if (meses < 0) return genero === 'MACHO' ? 'Bezerro Macho' : 'Bezerra Fêmea';
  const filtradas = regras.filter((r) => r.genero === genero);
  for (const r of filtradas) {
    if (meses >= r.idadeMinMeses && (r.idadeMaxMeses == null || meses <= r.idadeMaxMeses))
      return r.denominacao;
  }
  return genero === 'MACHO' ? 'Boi' : 'Vaca';
}

async function getDashboardData() {
  const [animaisVivos, porDenominacaoRaw, porProprietarioRaw, mortesTotal, mortesAno, mortesMes] = await Promise.all([
    prisma.animal.findMany({
      where: { status: 'VIVO' },
      select: { denominacao: true, proprietarioId: true, genero: true, eraMes: true, eraAno: true, reprodutor: true, createdAt: true },
    }),
    prisma.animal.groupBy({
      by: ['denominacao'],
      where: { status: 'VIVO' },
      _count: { id: true },
      orderBy: { denominacao: 'asc' },
    }),
    prisma.animal.groupBy({
      by: ['proprietarioId'],
      where: { status: 'VIVO' },
      _count: { id: true },
    }),
    prisma.morte.count(),
    prisma.morte.count({ where: { dataObito: { gte: new Date(new Date().getFullYear(), 0, 1) } } }),
    prisma.morte.count({ where: { dataObito: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) } } }),
  ]);

  const proprietarioIds = porProprietarioRaw.map((p) => p.proprietarioId);
  const [usuarios, regrasClass] = await Promise.all([
    prisma.user.findMany({ where: { id: { in: proprietarioIds } }, select: { id: true, name: true } }),
    prisma.classificacaoConfig.findMany({ orderBy: { ordem: 'asc' } }),
  ]);

  const counts: Record<string, number> = {};
  for (const a of animaisVivos) {
    counts[a.denominacao] = (counts[a.denominacao] ?? 0) + 1;
  }

  const total = animaisVivos.length;

  const porDenominacao = porDenominacaoRaw.map((d) => ({ denominacao: d.denominacao, total: d._count.id }));
  const porProprietario = porProprietarioRaw.map((p) => {
    const usuario = usuarios.find((u) => u.id === p.proprietarioId);
    return {
      nome: usuario?.name ?? 'Desconhecido',
      total: p._count.id,
      percentual: total > 0 ? Math.round((p._count.id / total) * 100) : 0,
    };
  });

  // Per-proprietário denomination breakdown for chart filter
  const denomPorProp: Record<string, Record<string, number>> = {};
  for (const a of animaisVivos) {
    const nome = usuarios.find((u) => u.id === a.proprietarioId)?.name ?? 'Desconhecido';
    if (!denomPorProp[nome]) denomPorProp[nome] = {};
    denomPorProp[nome][a.denominacao] = (denomPorProp[nome][a.denominacao] ?? 0) + 1;
  }
  const porDenominacaoPorProprietario: Record<string, { denominacao: string; total: number }[]> = {};
  for (const [nome, counts2] of Object.entries(denomPorProp)) {
    porDenominacaoPorProprietario[nome] = Object.entries(counts2)
      .map(([denominacao, t]) => ({ denominacao, total: t }))
      .sort((a, b) => a.denominacao.localeCompare(b.denominacao));
  }

  // ── Evolution data (last 18 months) ──────────────────────────────────────
  const today = new Date();
  const months = Array.from({ length: 18 }, (_, i) => {
    const d = new Date(today.getFullYear(), today.getMonth() - (17 - i), 1);
    const endOf = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
    return { ano: d.getFullYear(), mes: d.getMonth() + 1, endOf, label: `${MESES_PT_DASH[d.getMonth()]}/${d.getFullYear()}` };
  });

  // All denomination labels seen across all months (stable set)
  const denomSet = new Set<string>();
  for (const a of animaisVivos) denomSet.add(classEmMes(a.genero, a.eraMes, a.eraAno, a.reprodutor, regrasClass, today.getFullYear(), today.getMonth() + 1));
  const denominacoesEvolucao = Array.from(denomSet).sort();

  // All proprietário names (stable set)
  const propMap = new Map(usuarios.map((u) => [u.id, u.name]));
  const propNomes = Array.from(new Set(animaisVivos.map((a) => propMap.get(a.proprietarioId) ?? 'Desconhecido'))).sort();

  const evolucaoComposicao = months.map(({ ano, mes, endOf, label }) => {
    const entry: Record<string, number | string> = { label };
    for (const d of denominacoesEvolucao) entry[d] = 0;
    for (const a of animaisVivos) {
      if (a.createdAt > endOf) continue;
      const cls = classEmMes(a.genero, a.eraMes, a.eraAno, a.reprodutor, regrasClass, ano, mes);
      (entry[cls] as number)++;
    }
    return entry;
  });

  const evolucaoPorProprietario = months.map(({ endOf, label }) => {
    const entry: Record<string, number | string> = { label };
    for (const n of propNomes) entry[n] = 0;
    for (const a of animaisVivos) {
      if (a.createdAt > endOf) continue;
      const nome = propMap.get(a.proprietarioId) ?? 'Desconhecido';
      (entry[nome] as number)++;
    }
    return entry;
  });

  return {
    stats: {
      total,
      vaca: counts['Vaca'] ?? 0,
      boi: counts['Boi'] ?? 0,
      touro: counts['Touro'] ?? 0,
      novilha: counts['Novilha'] ?? 0,
      garrote: counts['Garrote'] ?? 0,
      bezerraFemea: counts['Bezerra Fêmea'] ?? 0,
      bezerroMacho: counts['Bezerro Macho'] ?? 0,
      mortesTotal,
      mortesAno,
      mortesMes,
    },
    porDenominacao,
    porProprietario,
    porDenominacaoPorProprietario,
    evolucaoComposicao,
    evolucaoPorProprietario,
    denominacoesEvolucao,
    propNomes,
  };
}

const proprietarioBorderColors: Record<string, string> = {
  'Luiz Henrique': '#1B58A3',
  'Luiz Antonio': '#4D37B0',
  'Leda': '#8B3B68',
};

const shortcuts = [
  { href: '/animais', label: 'Animais', icon: Beef, desc: 'Gerenciar rebanho', bg: 'bg-[#EEF3FB]', text: 'text-[#1B58A3]', hover: 'group-hover:bg-[#DDE9F9]', border: 'group-hover:border-[#BDD4F5]' },
  { href: '/importar', label: 'Importar', icon: Upload, desc: 'Via planilha Excel', bg: 'bg-[#EDF9F7]', text: 'text-[#1A6B5E]', hover: 'group-hover:bg-[#D8F4EF]', border: 'group-hover:border-[#B0E8DE]' },
  { href: '/mortes', label: 'Mortes', icon: Skull, desc: 'Registrar óbitos', bg: 'bg-[#FBF0EE]', text: 'text-[#9B3A2A]', hover: 'group-hover:bg-[#F6E2DE]', border: 'group-hover:border-[#EEC8C0]' },
  { href: '/sanitario', label: 'Sanitário', icon: Syringe, desc: 'Vacinas e remédios', bg: 'bg-[#EDF7F1]', text: 'text-[#2F6A47]', hover: 'group-hover:bg-[#D8F0E4]', border: 'group-hover:border-[#ACDCC2]' },
];

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');

  const { stats, porDenominacao, porProprietario, porDenominacaoPorProprietario, evolucaoComposicao, evolucaoPorProprietario, denominacoesEvolucao, propNomes } = await getDashboardData();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-[#111110]">Dashboard</h1>
        <p className="text-[#6B6B65] text-sm mt-0.5">Visão geral do rebanho da Fazenda Santo Antônio da Barra</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total de Animais" value={stats.total} sub="animais vivos"  color="#ef4444" />
        <StatCard label="Vacas"            value={stats.vaca}  sub="fêmeas adultas" color="#06b6d4" />
        <StatCard label="Bois"             value={stats.boi}   sub="machos adultos" color="#3b82f6" />
        <StatCard label="Touros"           value={stats.touro} sub="reprodutores"   color="#10b981" />
        <StatCard label="Novilhas"         value={stats.novilha}      sub="fêmeas jovens" color="#8b5cf6" />
        <StatCard label="Garrotes"         value={stats.garrote}      sub="machos jovens" color="#f59e0b" />
        <StatCard label="Bezerra Fêmea"    value={stats.bezerraFemea} sub="bezerras"      color="#ec4899" />
        <StatCard label="Bezerro Macho"    value={stats.bezerroMacho} sub="bezerros"      color="#f97316" />
      </div>

      {/* Charts + Proprietários */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          {/* Section title */}
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-sm font-semibold text-[#6B6B65] uppercase tracking-wide">Distribuição do Rebanho</h2>
            <div className="flex-1 h-px bg-[#E8E8E3]" />
          </div>
          <DashboardCharts porDenominacao={porDenominacao} porProprietario={porProprietario} porDenominacaoPorProprietario={porDenominacaoPorProprietario} evolucaoComposicao={evolucaoComposicao} evolucaoPorProprietario={evolucaoPorProprietario} denominacoesEvolucao={denominacoesEvolucao} propNomes={propNomes} />
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-semibold text-[#6B6B65] uppercase tracking-wide">Por Proprietário</h2>
            <div className="flex-1 h-px bg-[#E8E8E3]" />
          </div>

          {porProprietario.length === 0 ? (
            <div className="rounded-xl bg-white border border-[#E8E8E3] p-8 text-center">
              <Beef size={32} className="text-[#A8A8A2] mx-auto mb-2" />
              <p className="text-[#6B6B65] text-sm">Nenhum dado disponível</p>
            </div>
          ) : (
            porProprietario.map((p) => {
              const borderColor = proprietarioBorderColors[p.nome] ?? '#6366f1';
              return (
                <div
                  key={p.nome}
                  className="rounded-xl bg-white border border-[#E8E8E3] shadow-sm p-5"
                  style={{ borderLeftWidth: '3px', borderLeftColor: borderColor }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-xs font-medium text-[#6B6B65]">{p.nome}</p>
                      <p className="text-2xl font-bold text-[#111110] mt-0.5">{p.total}</p>
                      <p className="text-xs text-[#A8A8A2]">animais vivos</p>
                    </div>
                    <div
                      className="rounded-lg px-2.5 py-1 text-sm font-bold"
                      style={{ backgroundColor: `${borderColor}15`, color: borderColor }}
                    >
                      {p.percentual}%
                    </div>
                  </div>
                  <div className="bg-[#F0EFEB] rounded-full h-3">
                    <div
                      className="rounded-full h-3 transition-all"
                      style={{ width: `${p.percentual}%`, backgroundColor: `${borderColor}70` }}
                    />
                  </div>
                </div>
              );
            })
          )}

          {/* Mortes resumo */}
          <div className="rounded-xl bg-white border border-[#E8E8E3] shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <h3 className="text-xs font-semibold text-[#6B6B65] uppercase tracking-wide">Mortalidade</h3>
              <div className="flex-1 h-px bg-[#E8E8E3]" />
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs text-[#6B6B65]">Total registrado</span>
                <span className="text-sm font-bold text-[#111110]">{stats.mortesTotal}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-[#6B6B65]">Este ano</span>
                <span className="text-sm font-semibold text-orange-600">{stats.mortesAno}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-[#6B6B65]">Este mês</span>
                <span className="text-sm font-semibold text-red-600">{stats.mortesMes}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Shortcuts */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-sm font-semibold text-[#6B6B65] uppercase tracking-wide">Acesso Rápido</h2>
          <div className="flex-1 h-px bg-[#E8E8E3]" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {shortcuts.map((s) => {
            const Icon = s.icon;
            return (
              <Link
                key={s.href}
                href={s.href}
                className={`group rounded-xl bg-white border border-[#E8E8E3] p-5 hover:shadow-md transition-all ${s.border}`}
              >
                <div className={`inline-flex items-center justify-center w-9 h-9 rounded-lg transition-colors mb-3 ${s.bg} ${s.text} ${s.hover}`}>
                  <Icon size={18} />
                </div>
                <p className="text-sm font-semibold text-[#111110]">{s.label}</p>
                <p className="text-xs text-[#6B6B65] mt-0.5">{s.desc}</p>
              </Link>
            );
          })}
          {session.user.role === 'ADMIN' && (
            <Link
              href="/configuracoes"
              className="group rounded-xl bg-white border border-[#E8E8E3] p-5 hover:shadow-md transition-all group-hover:border-[#D0D0CA]"
            >
              <div className="inline-flex items-center justify-center w-9 h-9 rounded-lg transition-colors mb-3 bg-[#F5F4EF] text-[#6B6B65] group-hover:bg-[#EAEAE4]">
                <Settings size={18} />
              </div>
              <p className="text-sm font-semibold text-[#111110]">Configurações</p>
              <p className="text-xs text-[#6B6B65] mt-0.5">Admin do sistema</p>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
