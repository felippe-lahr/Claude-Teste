import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { StatCard } from '@/components/ui/stat-card';
import { DashboardCharts } from '@/components/dashboard/dashboard-charts';
import {
  Users,
  Heart,
  Beef,
  Shield,
  Star,
  Zap,
  Baby,
  Settings,
  Upload,
  Skull,
  Syringe,
} from 'lucide-react';
import Link from 'next/link';

async function getDashboardData() {
  const [animaisVivos, porDenominacaoRaw, porProprietarioRaw, mortesTotal, mortesAno, mortesMes] = await Promise.all([
    prisma.animal.findMany({
      where: { status: 'VIVO' },
      select: { denominacao: true, proprietarioId: true },
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
  const usuarios = await prisma.user.findMany({
    where: { id: { in: proprietarioIds } },
    select: { id: true, name: true },
  });

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
  };
}

const proprietarioBorderColors: Record<string, string> = {
  'Luiz Henrique': '#3b82f6',
  'Luiz Antonio': '#8b5cf6',
  'Leda': '#ec4899',
};

const shortcuts = [
  { href: '/animais', label: 'Animais', icon: Beef, desc: 'Gerenciar rebanho', bg: 'bg-blue-50', text: 'text-blue-600', hover: 'group-hover:bg-blue-100', border: 'group-hover:border-blue-200' },
  { href: '/importar', label: 'Importar', icon: Upload, desc: 'Via planilha Excel', bg: 'bg-violet-50', text: 'text-violet-600', hover: 'group-hover:bg-violet-100', border: 'group-hover:border-violet-200' },
  { href: '/mortes', label: 'Mortes', icon: Skull, desc: 'Registrar óbitos', bg: 'bg-red-50', text: 'text-red-600', hover: 'group-hover:bg-red-100', border: 'group-hover:border-red-200' },
  { href: '/sanitario', label: 'Sanitário', icon: Syringe, desc: 'Vacinas e remédios', bg: 'bg-emerald-50', text: 'text-emerald-600', hover: 'group-hover:bg-emerald-100', border: 'group-hover:border-emerald-200' },
];

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');

  const { stats, porDenominacao, porProprietario } = await getDashboardData();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 text-sm mt-0.5">Visão geral do rebanho da Fazenda Santo Antônio da Barra</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total de Animais" value={stats.total} sub="animais vivos" color="#ef4444" icon={Users} />
        <StatCard label="Vacas" value={stats.vaca} sub="fêmeas adultas" color="#06b6d4" icon={Heart} />
        <StatCard label="Bois" value={stats.boi} sub="machos adultos" color="#3b82f6" icon={Beef} />
        <StatCard label="Touros" value={stats.touro} sub="reprodutores" color="#10b981" icon={Shield} />
        <StatCard label="Novilhas" value={stats.novilha} sub="fêmeas jovens" color="#8b5cf6" icon={Star} />
        <StatCard label="Garrotes" value={stats.garrote} sub="machos jovens" color="#f59e0b" icon={Zap} />
        <StatCard label="Bezerra Fêmea" value={stats.bezerraFemea} sub="bezerras" color="#ec4899" icon={Baby} />
        <StatCard label="Bezerro Macho" value={stats.bezerroMacho} sub="bezerros" color="#f97316" icon={Baby} />
      </div>

      {/* Charts + Proprietários */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          {/* Section title */}
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Distribuição do Rebanho</h2>
            <div className="flex-1 h-px bg-slate-200" />
          </div>
          <DashboardCharts porDenominacao={porDenominacao} porProprietario={porProprietario} />
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Por Proprietário</h2>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          {porProprietario.length === 0 ? (
            <div className="rounded-xl bg-white border border-slate-200 p-8 text-center">
              <Beef size={32} className="text-slate-300 mx-auto mb-2" />
              <p className="text-slate-500 text-sm">Nenhum dado disponível</p>
            </div>
          ) : (
            porProprietario.map((p) => {
              const borderColor = proprietarioBorderColors[p.nome] ?? '#6366f1';
              return (
                <div
                  key={p.nome}
                  className="rounded-xl bg-white border border-slate-200 shadow-sm p-5"
                  style={{ borderLeftWidth: '3px', borderLeftColor: borderColor }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-xs font-medium text-slate-500">{p.nome}</p>
                      <p className="text-2xl font-bold text-slate-900 mt-0.5">{p.total}</p>
                      <p className="text-xs text-slate-400">animais vivos</p>
                    </div>
                    <div
                      className="rounded-lg px-2.5 py-1 text-sm font-bold"
                      style={{ backgroundColor: `${borderColor}15`, color: borderColor }}
                    >
                      {p.percentual}%
                    </div>
                  </div>
                  <div className="bg-slate-100 rounded-full h-1.5">
                    <div
                      className="rounded-full h-1.5 transition-all"
                      style={{ width: `${p.percentual}%`, backgroundColor: borderColor }}
                    />
                  </div>
                </div>
              );
            })
          )}

          {/* Mortes resumo */}
          <div className="rounded-xl bg-white border border-slate-200 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Mortalidade</h3>
              <div className="flex-1 h-px bg-slate-100" />
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500">Total registrado</span>
                <span className="text-sm font-bold text-slate-900">{stats.mortesTotal}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500">Este ano</span>
                <span className="text-sm font-semibold text-orange-600">{stats.mortesAno}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500">Este mês</span>
                <span className="text-sm font-semibold text-red-600">{stats.mortesMes}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Shortcuts */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Acesso Rápido</h2>
          <div className="flex-1 h-px bg-slate-200" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {shortcuts.map((s) => {
            const Icon = s.icon;
            return (
              <Link
                key={s.href}
                href={s.href}
                className={`group rounded-xl bg-white border border-slate-200 p-5 hover:shadow-md transition-all ${s.border}`}
              >
                <div className={`inline-flex items-center justify-center w-9 h-9 rounded-lg transition-colors mb-3 ${s.bg} ${s.text} ${s.hover}`}>
                  <Icon size={18} />
                </div>
                <p className="text-sm font-semibold text-slate-800">{s.label}</p>
                <p className="text-xs text-slate-500 mt-0.5">{s.desc}</p>
              </Link>
            );
          })}
          {session.user.role === 'ADMIN' && (
            <Link
              href="/configuracoes"
              className="group rounded-xl bg-white border border-slate-200 p-5 hover:shadow-md transition-all group-hover:border-slate-300"
            >
              <div className="inline-flex items-center justify-center w-9 h-9 rounded-lg transition-colors mb-3 bg-slate-50 text-slate-600 group-hover:bg-slate-100">
                <Settings size={18} />
              </div>
              <p className="text-sm font-semibold text-slate-800">Configurações</p>
              <p className="text-xs text-slate-500 mt-0.5">Admin do sistema</p>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
