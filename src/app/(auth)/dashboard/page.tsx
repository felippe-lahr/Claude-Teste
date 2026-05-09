import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { StatCard } from '@/components/ui/stat-card';
import { DashboardCharts } from '@/components/dashboard/dashboard-charts';
import { LayoutDashboard, Beef, Upload, Skull, Syringe, Settings } from 'lucide-react';
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

const proprietarioCores: Record<string, string> = {
  'Luiz Henrique': 'from-blue-500 to-blue-600',
  'Luiz Antonio': 'from-violet-500 to-violet-600',
  'Leda': 'from-pink-500 to-pink-600',
};

const shortcuts = [
  { href: '/animais', label: 'Animais', icon: Beef, desc: 'Gerenciar rebanho', color: 'bg-blue-50 text-blue-600 group-hover:bg-blue-100' },
  { href: '/importar', label: 'Importar', icon: Upload, desc: 'Via planilha Excel', color: 'bg-violet-50 text-violet-600 group-hover:bg-violet-100' },
  { href: '/mortes', label: 'Mortes', icon: Skull, desc: 'Registrar óbitos', color: 'bg-red-50 text-red-600 group-hover:bg-red-100' },
  { href: '/sanitario', label: 'Sanitário', icon: Syringe, desc: 'Vacinas e remédios', color: 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100' },
];

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');

  const { stats, porDenominacao, porProprietario } = await getDashboardData();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <LayoutDashboard size={24} className="text-brand-500" />
          Dashboard
        </h1>
        <p className="text-slate-500 text-sm mt-1">Visão geral do rebanho da Fazenda Santo Antônio da Barra</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-4 gap-4">
        <StatCard label="Total de Animais" value={stats.total} sub="animais vivos" gradient="from-red-500 to-red-600" />
        <StatCard label="Vacas" value={stats.vaca} sub="fêmeas adultas" gradient="from-cyan-500 to-cyan-600" />
        <StatCard label="Bois" value={stats.boi} sub="machos adultos" gradient="from-blue-500 to-blue-600" />
        <StatCard label="Touros" value={stats.touro} sub="reprodutores" gradient="from-emerald-500 to-emerald-600" />
        <StatCard label="Novilhas" value={stats.novilha} sub="fêmeas jovens" gradient="from-violet-500 to-violet-600" />
        <StatCard label="Garrotes" value={stats.garrote} sub="machos jovens" gradient="from-amber-500 to-amber-600" />
        <StatCard label="Bezerra Fêmea" value={stats.bezerraFemea} sub="bezerras" gradient="from-pink-500 to-pink-600" />
        <StatCard label="Bezerro Macho" value={stats.bezerroMacho} sub="bezerros" gradient="from-orange-500 to-orange-600" />
      </div>

      {/* Charts + Proprietários */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <DashboardCharts porDenominacao={porDenominacao} porProprietario={porProprietario} />
        </div>

        <div className="space-y-4">
          <h2 className="text-base font-semibold text-slate-800">Por Proprietário</h2>
          {porProprietario.length === 0 ? (
            <div className="rounded-xl bg-white border border-slate-200 p-8 text-center">
              <Beef size={32} className="text-slate-300 mx-auto mb-2" />
              <p className="text-slate-500 text-sm">Nenhum dado disponível</p>
            </div>
          ) : (
            porProprietario.map((p) => (
              <div
                key={p.nome}
                className={`rounded-xl bg-gradient-to-br ${proprietarioCores[p.nome] ?? 'from-slate-500 to-slate-600'} p-5 text-white shadow-md`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-white/80">{p.nome}</p>
                    <p className="text-3xl font-bold mt-1">{p.total}</p>
                    <p className="text-xs text-white/70 mt-1">animais vivos</p>
                  </div>
                  <div className="bg-white/20 rounded-lg px-3 py-1">
                    <span className="text-lg font-bold">{p.percentual}%</span>
                  </div>
                </div>
                <div className="mt-3 bg-white/20 rounded-full h-1.5">
                  <div className="bg-white rounded-full h-1.5" style={{ width: `${p.percentual}%` }} />
                </div>
              </div>
            ))
          )}

          {/* Mortes resumo */}
          <div className="rounded-xl bg-white border border-slate-200 p-5 space-y-3">
            <h3 className="text-sm font-semibold text-slate-800">Mortalidade</h3>
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

      {/* Shortcuts */}
      <div>
        <h2 className="text-base font-semibold text-slate-800 mb-4">Acesso Rápido</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {shortcuts.map((s) => {
            const Icon = s.icon;
            return (
              <Link
                key={s.href}
                href={s.href}
                className="group rounded-xl bg-white border border-slate-200 p-5 hover:border-brand-300 hover:shadow-md transition-all"
              >
                <div className={`inline-flex items-center justify-center w-10 h-10 rounded-lg transition-colors mb-3 ${s.color}`}>
                  <Icon size={20} />
                </div>
                <p className="text-sm font-semibold text-slate-800">{s.label}</p>
                <p className="text-xs text-slate-500 mt-0.5">{s.desc}</p>
              </Link>
            );
          })}
          {session.user.role === 'ADMIN' && (
            <Link
              href="/configuracoes"
              className="group rounded-xl bg-white border border-slate-200 p-5 hover:border-brand-300 hover:shadow-md transition-all"
            >
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg transition-colors mb-3 bg-slate-50 text-slate-600 group-hover:bg-slate-100">
                <Settings size={20} />
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
