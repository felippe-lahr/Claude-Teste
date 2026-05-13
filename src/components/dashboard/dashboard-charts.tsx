'use client';

import { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend, LabelList,
} from 'recharts';

interface DenominacaoItem {
  denominacao: string;
  total: number;
}

interface ProprietarioItem {
  nome: string;
  total: number;
  percentual: number;
}

interface Props {
  porDenominacao: DenominacaoItem[];
  porProprietario: ProprietarioItem[];
  porDenominacaoPorProprietario: Record<string, DenominacaoItem[]>;
}

const DENOM_COLORS: Record<string, string> = {
  'Vaca':          '#8B3B68',
  'Boi':           '#1B58A3',
  'Touro':         '#4D37B0',
  'Novilha':       '#1A6B5E',
  'Garrote':       '#8A4E1C',
  'Bezerra Fêmea': '#A0347A',
  'Bezerro Macho': '#1565A8',
};
const DEFAULT_COLOR = '#6B6B65';

const PIE_COLORS = ['#1B58A3', '#4D37B0', '#8B3B68', '#1A6B5E', '#8A4E1C'];

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-[#E8E8E3] rounded-lg px-3 py-2 shadow-md text-xs">
      <p className="font-semibold text-[#111110] mb-0.5">{label}</p>
      <p className="text-[#6B6B65]">{payload[0].value} animais</p>
    </div>
  );
};

export function DashboardCharts({ porDenominacao, porProprietario, porDenominacaoPorProprietario }: Props) {
  const proprietarios = Object.keys(porDenominacaoPorProprietario).sort();
  const [selected, setSelected] = useState<string>('total');

  const chartData = selected === 'total'
    ? porDenominacao
    : (porDenominacaoPorProprietario[selected] ?? []);

  const maxVal = Math.max(...chartData.map((d) => d.total), 1);

  return (
    <div className="space-y-6">
      {/* Bar chart */}
      <div className="bg-white rounded-xl border border-[#E8E8E3] p-6 shadow-sm">
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <h2 className="text-sm font-semibold text-[#111110]">Animais por Denominação</h2>

          {/* Filter tabs */}
          <div className="flex items-center gap-1 p-1 bg-[#F5F4EF] rounded-lg">
            <button
              onClick={() => setSelected('total')}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                selected === 'total'
                  ? 'bg-[#111110] text-white shadow-sm'
                  : 'text-[#6B6B65] hover:text-[#111110]'
              }`}
            >
              Total
            </button>
            {proprietarios.map((nome) => (
              <button
                key={nome}
                onClick={() => setSelected(nome)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all whitespace-nowrap ${
                  selected === nome
                    ? 'bg-[#111110] text-white shadow-sm'
                    : 'text-[#6B6B65] hover:text-[#111110]'
                }`}
              >
                {nome}
              </button>
            ))}
          </div>
        </div>

        {chartData.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-[#A8A8A2] text-sm">
            Nenhum dado disponível
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(200, chartData.length * 44)}>
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 0, right: 48, left: 0, bottom: 0 }}
              barCategoryGap="30%"
            >
              <XAxis
                type="number"
                domain={[0, maxVal + 1]}
                tick={{ fontSize: 10, fill: '#A8A8A2' }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
                tickCount={Math.min(maxVal + 2, 6)}
              />
              <YAxis
                type="category"
                dataKey="denominacao"
                width={100}
                tick={{ fontSize: 12, fill: '#6B6B65' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: '#F5F4EF' }} />
              <Bar dataKey="total" radius={[0, 6, 6, 0]} maxBarSize={28}>
                <LabelList
                  dataKey="total"
                  position="right"
                  style={{ fontSize: 11, fontWeight: 600, fill: '#6B6B65' }}
                />
                {chartData.map((entry) => (
                  <Cell key={entry.denominacao} fill={DENOM_COLORS[entry.denominacao] ?? DEFAULT_COLOR} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Pie chart */}
      <div className="bg-white rounded-xl border border-[#E8E8E3] p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-[#111110] mb-5">Distribuição por Proprietário</h2>
        {porProprietario.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-[#A8A8A2] text-sm">
            Nenhum dado disponível
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={porProprietario}
                dataKey="total"
                nameKey="nome"
                cx="50%"
                cy="50%"
                outerRadius={76}
                innerRadius={44}
                paddingAngle={3}
                label={(props) => {
                  const d = props as { nome?: string; percentual?: number };
                  if (!d.nome) return '';
                  return `${d.nome.split(' ')[0]} ${d.percentual ?? 0}%`;
                }}
                labelLine={false}
              >
                {porProprietario.map((_, index) => (
                  <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ borderRadius: 8, border: '1px solid #E8E8E3', fontSize: 12, color: '#111110' }}
                formatter={(value, name) => [value, name]}
              />
              <Legend
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: 12, color: '#6B6B65' }}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
