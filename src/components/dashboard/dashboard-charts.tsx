'use client';

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend,
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
}

const DENOM_COLORS: Record<string, string> = {
  'Vaca': '#0ea5e9',
  'Boi': '#10b981',
  'Touro': '#22c55e',
  'Novilha': '#8b5cf6',
  'Garrote': '#f59e0b',
  'Bezerra Fêmea': '#ec4899',
  'Bezerro Macho': '#f97316',
};

const PIE_COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b'];

export function DashboardCharts({ porDenominacao, porProprietario }: Props) {
  return (
    <div className="space-y-6">
      {/* Bar chart */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <h2 className="text-base font-semibold text-slate-800 mb-4">Animais por Denominação</h2>
        {porDenominacao.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-slate-400 text-sm">
            Nenhum dado disponível
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={porDenominacao} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <XAxis
                dataKey="denominacao"
                tick={{ fontSize: 11, fill: '#64748b' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#64748b' }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
                formatter={(value) => [value, 'Animais']}
              />
              <Bar dataKey="total" radius={[6, 6, 0, 0]} maxBarSize={48}>
                {porDenominacao.map((entry) => (
                  <Cell key={entry.denominacao} fill={DENOM_COLORS[entry.denominacao] ?? '#6366f1'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Pie chart */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <h2 className="text-base font-semibold text-slate-800 mb-4">Distribuição por Proprietário</h2>
        {porProprietario.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-slate-400 text-sm">
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
                outerRadius={72}
                innerRadius={40}
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
                contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
                formatter={(value, name) => [value, name]}
              />
              <Legend
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: 12 }}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
