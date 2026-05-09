'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Plus, Syringe, Trash2, ChevronLeft, ChevronRight, Search, ShieldCheck, Pill } from 'lucide-react';
import { SanitarioDrawer } from '@/components/sanitario/sanitario-drawer';
import { TableSkeleton } from '@/components/ui/skeleton';
import { StatCard } from '@/components/ui/stat-card';

interface RegistroSanitario {
  id: number;
  tipo: 'VACINA' | 'MEDICAMENTO';
  produto: string;
  data: string;
  dose: string | null;
  observacoes: string | null;
  animal: {
    id: number;
    numero: string | null;
    denominacao: string;
    proprietario: { name: string };
  };
}

export default function SanitarioPage() {
  const [registros, setRegistros] = useState<RegistroSanitario[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [filters, setFilters] = useState({
    produto: '',
    tipo: '',
    dataInicio: '',
    dataFim: '',
  });

  const fetchRegistros = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
      const res = await fetch(`/api/sanitario?${params}`);
      const data = await res.json();
      setRegistros(data.registros ?? []);
      setTotal(data.total ?? 0);
      setPages(data.pages ?? 1);
    } catch {
      toast.error('Erro ao carregar registros');
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => { fetchRegistros(); }, [fetchRegistros]);

  function handleFilterChange(key: string, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  }

  async function handleDelete(id: number) {
    if (!confirm('Excluir este registro sanitário?')) return;
    try {
      const res = await fetch(`/api/sanitario/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success('Registro excluído');
      fetchRegistros();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao excluir');
    }
  }

  const vacinaCount = registros.filter((r) => r.tipo === 'VACINA').length;
  const medicCount = registros.filter((r) => r.tipo === 'MEDICAMENTO').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Syringe size={24} className="text-emerald-500" />
            Sanitário
          </h1>
          <p className="text-slate-500 text-sm mt-1">Controle de vacinas e medicamentos</p>
        </div>
        <button
          onClick={() => setDrawerOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition"
        >
          <Plus size={16} />
          Registro Individual
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Total de Registros" value={total} sub="no filtro atual" color="#10b981" icon={Syringe} />
        <StatCard label="Vacinas" value={vacinaCount} sub="página atual" color="#3b82f6" icon={ShieldCheck} />
        <StatCard label="Medicamentos" value={medicCount} sub="página atual" color="#f97316" icon={Pill} />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              placeholder="Produto..."
              value={filters.produto}
              onChange={(e) => handleFilterChange('produto', e.target.value)}
              className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <select
            value={filters.tipo}
            onChange={(e) => handleFilterChange('tipo', e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
          >
            <option value="">Tipo</option>
            <option value="VACINA">Vacina</option>
            <option value="MEDICAMENTO">Medicamento</option>
          </select>
          <div>
            <label className="block text-xs text-slate-500 mb-1">De</label>
            <input
              type="date"
              value={filters.dataInicio}
              onChange={(e) => handleFilterChange('dataInicio', e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Até</label>
            <input
              type="date"
              value={filters.dataFim}
              onChange={(e) => handleFilterChange('dataFim', e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-6"><TableSkeleton rows={8} cols={7} /></div>
        ) : registros.length === 0 ? (
          <div className="py-16 text-center">
            <Syringe size={48} className="text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">Nenhum registro encontrado</p>
            <p className="text-slate-400 text-sm mt-1">Adicione registros sanitários usando o botão acima</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {['Animal','Proprietário','Tipo','Produto','Data','Dose','Observações',''].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {registros.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {r.animal.numero ? `Nº ${r.animal.numero}` : `#${r.animal.id}`}
                      <span className="ml-1.5 text-xs text-slate-400">{r.animal.denominacao}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{r.animal.proprietario.name}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${r.tipo === 'VACINA' ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'}`}>
                        {r.tipo}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700 font-medium">{r.produto}</td>
                    <td className="px-4 py-3 text-slate-600">{new Date(r.data).toLocaleDateString('pt-BR')}</td>
                    <td className="px-4 py-3 text-slate-600">{r.dose ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-500 max-w-xs truncate">{r.observacoes ?? '—'}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleDelete(r.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-slate-50">
            <p className="text-xs text-slate-500">Página {page} de {pages} · {total} registros</p>
            <div className="flex gap-1">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 rounded-lg border border-slate-300 text-slate-600 hover:bg-white disabled:opacity-40 transition">
                <ChevronLeft size={14} />
              </button>
              <button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page === pages} className="p-1.5 rounded-lg border border-slate-300 text-slate-600 hover:bg-white disabled:opacity-40 transition">
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      <SanitarioDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} onSaved={fetchRegistros} />
    </div>
  );
}
