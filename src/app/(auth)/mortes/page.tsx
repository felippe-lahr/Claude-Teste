'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Plus, Skull, Trash2, ChevronLeft, ChevronRight, TrendingDown, CalendarDays, CalendarClock, Filter } from 'lucide-react';
import { MorteDrawer } from '@/components/mortes/morte-drawer';
import { formatMonthYearBR } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { StatCard } from '@/components/ui/stat-card';
import { TableSkeleton } from '@/components/ui/skeleton';
import { useSearchParams } from 'next/navigation';

interface Proprietario { id: number; name: string }

interface Morte {
  id: number;
  dataObito: string;
  causa: string | null;
  observacoes: string | null;
  animal: {
    id: number;
    numero: string | null;
    denominacao: string;
    proprietario: { name: string };
  };
  registradoPor: { name: string };
}

const MESES = [
  { value: '1', label: 'Janeiro' },
  { value: '2', label: 'Fevereiro' },
  { value: '3', label: 'Março' },
  { value: '4', label: 'Abril' },
  { value: '5', label: 'Maio' },
  { value: '6', label: 'Junho' },
  { value: '7', label: 'Julho' },
  { value: '8', label: 'Agosto' },
  { value: '9', label: 'Setembro' },
  { value: '10', label: 'Outubro' },
  { value: '11', label: 'Novembro' },
  { value: '12', label: 'Dezembro' },
];

const currentYear = new Date().getFullYear();
const ANOS = Array.from({ length: 6 }, (_, i) => currentYear - i);

const selectClass = 'w-full bg-[#F5F4EF] border border-[#E8E8E3] rounded-lg px-3 py-2 text-xs text-[#111110] focus:outline-none focus:ring-1 focus:ring-[#2F6A47] focus:border-[#2F6A47]';

export default function MortesPage() {
  const searchParams = useSearchParams();
  const preAnimalId = searchParams.get('animalId');

  const [mortes, setMortes] = useState<Morte[]>([]);
  const [total, setTotal] = useState(0);
  const [mortesAno, setMortesAno] = useState(0);
  const [mortesMes, setMortesMes] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(!!preAnimalId);
  const [proprietarios, setProprietarios] = useState<Proprietario[]>([]);

  const [filters, setFilters] = useState({ proprietarioId: '', mes: '', ano: '' });

  const fetchMortes = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (filters.proprietarioId) params.set('proprietarioId', filters.proprietarioId);
      if (filters.mes) params.set('mes', filters.mes);
      if (filters.ano) params.set('ano', filters.ano);

      const res = await fetch(`/api/mortes?${params}`);
      const data = await res.json();
      setMortes(data.mortes ?? []);
      setTotal(data.total ?? 0);
      setMortesAno(data.mortesAno ?? 0);
      setMortesMes(data.mortesMes ?? 0);
      setPages(data.pages ?? 1);
      if (data.proprietarios) setProprietarios(data.proprietarios);
    } catch {
      toast.error('Erro ao carregar mortes');
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => { fetchMortes(); }, [fetchMortes]);

  function handleFilter(key: string, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  }

  const hasFilters = filters.proprietarioId || filters.mes || filters.ano;

  async function handleDelete(id: number) {
    if (!confirm('Remover este registro de morte? O animal voltará ao status VIVO.')) return;
    try {
      const res = await fetch(`/api/mortes/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success('Registro removido. Animal reativado.');
      fetchMortes();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao remover');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#111110] flex items-center gap-2">
            <Skull size={24} className="text-[#9B3A2A]" />
            Mortes
          </h1>
          <p className="text-[#6B6B65] text-sm mt-1">Registro de óbitos do rebanho</p>
        </div>
        <button
          onClick={() => setDrawerOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#9B3A2A] hover:bg-[#832f22] text-white text-sm font-semibold transition"
        >
          <Plus size={16} />
          Registrar Morte
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Total Registrado" value={total} sub="todos os tempos" color="#9B3A2A" icon={TrendingDown} />
        <StatCard label="Este Ano" value={mortesAno} sub={String(new Date().getFullYear())} color="#C0622A" icon={CalendarDays} />
        <StatCard label="Este Mês" value={mortesMes} sub="mês atual" color="#B04458" icon={CalendarClock} />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-[#E8E8E3] p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Filter size={13} className="text-[#A8A8A2]" />
          <span className="text-xs font-semibold text-[#6B6B65] uppercase tracking-wide">Filtros</span>
          {hasFilters && (
            <button
              onClick={() => { setFilters({ proprietarioId: '', mes: '', ano: '' }); setPage(1); }}
              className="ml-auto text-xs text-[#9B3A2A] hover:underline"
            >
              Limpar filtros
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <select value={filters.proprietarioId} onChange={(e) => handleFilter('proprietarioId', e.target.value)} className={selectClass}>
            <option value="">Todos os proprietários</option>
            {proprietarios.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select value={filters.mes} onChange={(e) => handleFilter('mes', e.target.value)} className={selectClass}>
            <option value="">Todos os meses</option>
            {MESES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
          <select value={filters.ano} onChange={(e) => handleFilter('ano', e.target.value)} className={selectClass}>
            <option value="">Todos os anos</option>
            {ANOS.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-[#E8E8E3] shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-6"><TableSkeleton rows={8} cols={6} /></div>
        ) : mortes.length === 0 ? (
          <div className="py-16 text-center">
            <Skull size={48} className="text-[#E8E8E3] mx-auto mb-3" />
            <p className="text-[#6B6B65] font-medium">Nenhuma morte encontrada</p>
            <p className="text-[#A8A8A2] text-sm mt-1">
              {hasFilters ? 'Tente ajustar os filtros' : 'Os registros de óbitos aparecerão aqui'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#F5F4EF] border-b border-[#E8E8E3]">
                <tr>
                  {['Animal', 'Proprietário', 'Denominação', 'Data Óbito', 'Causa', 'Registrado por', ''].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-[#A8A8A2] uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0EFEB]">
                {mortes.map((morte) => (
                  <tr key={morte.id} className="hover:bg-[#F5F4EF] transition-colors">
                    <td className="px-4 py-3 font-medium text-[#111110]">
                      {morte.animal.numero ? `Nº ${morte.animal.numero}` : `#${morte.animal.id}`}
                    </td>
                    <td className="px-4 py-3 text-[#6B6B65]">{morte.animal.proprietario.name}</td>
                    <td className="px-4 py-3">
                      <Badge variant="denominacao" value={morte.animal.denominacao}>{morte.animal.denominacao}</Badge>
                    </td>
                    <td className="px-4 py-3 text-[#6B6B65]">{formatMonthYearBR(morte.dataObito)}</td>
                    <td className="px-4 py-3 text-[#6B6B65]">{morte.causa ?? '—'}</td>
                    <td className="px-4 py-3 text-[#A8A8A2] text-xs">{morte.registradoPor.name}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleDelete(morte.id)}
                        className="p-1.5 rounded-lg text-[#A8A8A2] hover:text-[#9B3A2A] hover:bg-[#FBF0EE] transition"
                        title="Remover registro"
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
          <div className="flex items-center justify-between px-4 py-3 border-t border-[#E8E8E3] bg-[#F5F4EF]">
            <p className="text-xs text-[#A8A8A2]">Página {page} de {pages} · {total} registros</p>
            <div className="flex gap-1">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 rounded-lg border border-[#E8E8E3] text-[#6B6B65] hover:bg-white disabled:opacity-40 transition">
                <ChevronLeft size={14} />
              </button>
              <button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page === pages} className="p-1.5 rounded-lg border border-[#E8E8E3] text-[#6B6B65] hover:bg-white disabled:opacity-40 transition">
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      <MorteDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSaved={fetchMortes}
        preAnimalId={preAnimalId ? parseInt(preAnimalId) : null}
      />
    </div>
  );
}
