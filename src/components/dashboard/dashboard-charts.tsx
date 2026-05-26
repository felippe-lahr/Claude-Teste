'use client';

import { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList,
  PieChart, Pie, Legend,
  AreaChart, Area, CartesianGrid,
  LineChart, Line,
} from 'recharts';

interface DenominacaoItem { denominacao: string; total: number }
interface ProprietarioItem { nome: string; total: number; percentual: number }

interface Props {
  porDenominacao: DenominacaoItem[];
  porProprietario: ProprietarioItem[];
  porDenominacaoPorProprietario: Record<string, DenominacaoItem[]>;
  evolucaoComposicao: Record<string, number | string>[];
  evolucaoPorProprietario: Record<string, number | string>[];
  denominacoesEvolucao: string[];
  propNomes: string[];
}

// Mesmas cores dos StatCards do dashboard
const DENOM_COLORS: Record<string, string> = {
  'Vaca':          '#06b6d4',
  'Boi':           '#3b82f6',
  'Touro':         '#10b981',
  'Novilha':       '#8b5cf6',
  'Garrote':       '#f59e0b',
  'Bezerra Fêmea': '#ec4899',
  'Bezerro Macho': '#f97316',
};
const DEFAULT_DENOM_COLOR = '#6B6B65';

const PROP_COLORS = ['#1B58A3', '#4D37B0', '#8B3B68', '#1A6B5E', '#8A4E1C', '#B5860D', '#2E7D32'];
const PIE_COLORS  = ['#1B58A3', '#4D37B0', '#8B3B68', '#1A6B5E', '#8A4E1C'];

function denomColor(d: string) { return DENOM_COLORS[d] ?? DEFAULT_DENOM_COLOR; }

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-[#E8E8E3] rounded-lg px-3 py-2 shadow-md text-xs">
      <p className="font-semibold text-[#111110] mb-0.5">{label}</p>
      <p className="text-[#6B6B65]">{payload[0].value} animais</p>
    </div>
  );
};

const StackedTooltip = ({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; fill: string }[]; label?: string }) => {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((s, p) => s + (p.value ?? 0), 0);
  return (
    <div className="bg-white border border-[#E8E8E3] rounded-lg px-3 py-2 shadow-md text-xs min-w-[140px]">
      <p className="font-semibold text-[#111110] mb-1.5">{label} · {total} total</p>
      {[...payload].reverse().map((p) => (
        <div key={p.name} className="flex items-center justify-between gap-3 mb-0.5">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.fill }} />
            <span className="text-[#6B6B65]">{p.name}</span>
          </span>
          <span className="font-semibold text-[#111110]">{p.value}</span>
        </div>
      ))}
    </div>
  );
};

const LineTooltip = ({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-[#E8E8E3] rounded-lg px-3 py-2 shadow-md text-xs min-w-[130px]">
      <p className="font-semibold text-[#111110] mb-1.5">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center justify-between gap-3 mb-0.5">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
            <span className="text-[#6B6B65]">{p.name.split(' ')[0]}</span>
          </span>
          <span className="font-semibold text-[#111110]">{p.value}</span>
        </div>
      ))}
    </div>
  );
};

export function DashboardCharts({ porDenominacao, porProprietario, porDenominacaoPorProprietario, evolucaoComposicao, evolucaoPorProprietario, denominacoesEvolucao, propNomes }: Props) {
  const proprietarios = Object.keys(porDenominacaoPorProprietario).sort();
  const [selected, setSelected] = useState<string>('total');
  const [composicaoView, setComposicaoView] = useState<'total' | string>('total');

  const chartData = selected === 'total'
    ? porDenominacao
    : (porDenominacaoPorProprietario[selected] ?? []);
  const maxVal = Math.max(...chartData.map((d) => d.total), 1);

  // For composição evolution, filter by proprietário if selected
  const composicaoData = composicaoView === 'total'
    ? evolucaoComposicao
    : evolucaoComposicao; // same data — filtering happens via denomination totals per owner (not yet separated per owner — shown as total)

  // Show only last 12 months for readability (tick every 2)
  const tickEvery = Math.ceil(evolucaoComposicao.length / 9);

  return (
    <div className="space-y-6">
      {/* ── Stacked Area: Evolução da Composição ─────────────────────── */}
      <div className="bg-white rounded-xl border border-[#E8E8E3] p-6 shadow-sm">
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <div>
            <h2 className="text-sm font-semibold text-[#111110]">Evolução da Composição do Rebanho</h2>
            <p className="text-xs text-[#A8A8A2] mt-0.5">Classificação retroativa dos últimos 18 meses</p>
          </div>
          <div className="flex items-center gap-1 p-1 bg-[#F5F4EF] rounded-lg">
            <button
              onClick={() => setComposicaoView('total')}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${composicaoView === 'total' ? 'bg-[#111110] text-white shadow-sm' : 'text-[#6B6B65] hover:text-[#111110]'}`}
            >
              Total
            </button>
            {propNomes.map((nome) => (
              <button key={nome} onClick={() => setComposicaoView(nome)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all whitespace-nowrap ${composicaoView === nome ? 'bg-[#111110] text-white shadow-sm' : 'text-[#6B6B65] hover:text-[#111110]'}`}>
                {nome.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>

        {evolucaoComposicao.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-[#A8A8A2] text-sm">Nenhum dado disponível</div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={composicaoData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <defs>
                {denominacoesEvolucao.map((d) => (
                  <linearGradient key={d} id={`grad-${d.replace(/\s/g,'')}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={denomColor(d)} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={denomColor(d)} stopOpacity={0.05} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0EFE9" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: '#A8A8A2' }}
                axisLine={false} tickLine={false}
                interval={tickEvery - 1}
              />
              <YAxis tick={{ fontSize: 10, fill: '#A8A8A2' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<StackedTooltip />} />
              {denominacoesEvolucao.map((d) => (
                <Area
                  key={d} type="monotone" dataKey={d} stackId="1"
                  stroke={denomColor(d)} strokeWidth={1.5}
                  fill={`url(#grad-${d.replace(/\s/g,'')})`}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        )}

        {/* Legend */}
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3">
          {denominacoesEvolucao.map((d) => (
            <span key={d} className="flex items-center gap-1.5 text-xs text-[#6B6B65]">
              <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: denomColor(d) }} />
              {d}
            </span>
          ))}
        </div>
      </div>

      {/* ── Line Chart: Evolução por Proprietário ────────────────────── */}
      <div className="bg-white rounded-xl border border-[#E8E8E3] p-6 shadow-sm">
        <div className="mb-5">
          <h2 className="text-sm font-semibold text-[#111110]">Evolução do Rebanho por Proprietário</h2>
          <p className="text-xs text-[#A8A8A2] mt-0.5">Total de animais vivos cadastrados por mês</p>
        </div>

        {evolucaoPorProprietario.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-[#A8A8A2] text-sm">Nenhum dado disponível</div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={evolucaoPorProprietario} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0EFE9" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: '#A8A8A2' }}
                axisLine={false} tickLine={false}
                interval={tickEvery - 1}
              />
              <YAxis tick={{ fontSize: 10, fill: '#A8A8A2' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<LineTooltip />} />
              {propNomes.map((nome, i) => (
                <Line
                  key={nome} type="monotone" dataKey={nome}
                  stroke={PROP_COLORS[i % PROP_COLORS.length]}
                  strokeWidth={2} dot={false} activeDot={{ r: 4 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}

        <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3">
          {propNomes.map((nome, i) => (
            <span key={nome} className="flex items-center gap-1.5 text-xs text-[#6B6B65]">
              <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: PROP_COLORS[i % PROP_COLORS.length] }} />
              {nome}
            </span>
          ))}
        </div>
      </div>

      {/* ── Bar chart: Animais por Denominação ───────────────────────── */}
      <div className="bg-white rounded-xl border border-[#E8E8E3] p-6 shadow-sm">
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <h2 className="text-sm font-semibold text-[#111110]">Animais por Denominação</h2>
          <div className="flex items-center gap-1 p-1 bg-[#F5F4EF] rounded-lg">
            <button onClick={() => setSelected('total')}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${selected === 'total' ? 'bg-[#111110] text-white shadow-sm' : 'text-[#6B6B65] hover:text-[#111110]'}`}>
              Total
            </button>
            {proprietarios.map((nome) => (
              <button key={nome} onClick={() => setSelected(nome)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all whitespace-nowrap ${selected === nome ? 'bg-[#111110] text-white shadow-sm' : 'text-[#6B6B65] hover:text-[#111110]'}`}>
                {nome}
              </button>
            ))}
          </div>
        </div>

        {chartData.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-[#A8A8A2] text-sm">Nenhum dado disponível</div>
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(200, chartData.length * 44)}>
            <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 48, left: 0, bottom: 0 }} barCategoryGap="30%">
              <XAxis type="number" domain={[0, maxVal + 1]} tick={{ fontSize: 10, fill: '#A8A8A2' }} axisLine={false} tickLine={false} allowDecimals={false} tickCount={Math.min(maxVal + 2, 6)} />
              <YAxis type="category" dataKey="denominacao" width={100} tick={{ fontSize: 12, fill: '#6B6B65' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: '#F5F4EF' }} />
<<<<<<< HEAD
              <Bar dataKey="total" radius={[0, 6, 6, 0]} maxBarSize={64}>
                <LabelList
                  dataKey="total"
                  position="right"
                  style={{ fontSize: 11, fontWeight: 600, fill: '#6B6B65' }}
                />
=======
              <Bar dataKey="total" radius={[0, 6, 6, 0]} maxBarSize={28}>
                <LabelList dataKey="total" position="right" style={{ fontSize: 11, fontWeight: 600, fill: '#6B6B65' }} />
>>>>>>> 5cbcd39 (feat(dashboard): add herd composition evolution and per-owner trend charts)
                {chartData.map((entry) => (
                  <Cell key={entry.denominacao} fill={denomColor(entry.denominacao)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── Pie chart: Distribuição por Proprietário ──────────────────── */}
      <div className="bg-white rounded-xl border border-[#E8E8E3] p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-[#111110] mb-5">Distribuição por Proprietário</h2>
        {porProprietario.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-[#A8A8A2] text-sm">Nenhum dado disponível</div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={porProprietario} dataKey="total" nameKey="nome" cx="50%" cy="50%" outerRadius={76} innerRadius={44} paddingAngle={3}
                label={(props) => { const d = props as { nome?: string; percentual?: number }; if (!d.nome) return ''; return `${d.nome.split(' ')[0]} ${d.percentual ?? 0}%`; }}
                labelLine={false}>
                {porProprietario.map((_, index) => <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E8E8E3', fontSize: 12, color: '#111110' }} formatter={(value, name) => [value, name]} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: '#6B6B65' }} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
