'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Plus, Skull, Trash2, ChevronLeft, ChevronRight, TrendingDown, CalendarDays, CalendarClock } from 'lucide-react';
import { MorteDrawer } from '@/components/mortes/morte-drawer';
import { Badge } from '@/components/ui/badge';
import { StatCard } from '@/components/ui/stat-card';
import { TableSkeleton } from '@/components/ui/skeleton';
import { useSearchParams } from 'next/navigation';

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

  const fetchMortes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/mortes?page=${page}&limit=20`);
      const data = await res.json();
      setMortes(data.mortes ?? []);
      setTotal(data.total ?? 0);
      setMortesAno(data.mortesAno ?? 0);
      setMortesMes(data.mortesMes ?? 0);
      setPages(data.pages ?? 1);
    } catch {
      toast.error('Erro ao carregar mortes');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { fetchMortes(); }, [fetchMortes]);

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
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Skull size={24} className="text-red-500" />
            Mortes
          </h1>
          <p className="text-slate-500 text-sm mt-1">Registro de óbitos do rebanho</p>
        </div>
        <button
          onClick={() => setDrawerOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition"
        >
          <Plus size={16} />
          Registrar Morte
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Total Registrado" value={total} sub="todos os tempos" color="#ef4444" icon={TrendingDown} />
        <StatCard label="Este Ano" value={mortesAno} sub={String(new Date().getFullYear())} color="#f97316" icon={CalendarDays} />
        <StatCard label="Este Mês" value={mortesMes} sub="mês atual" color="#f43f5e" icon={CalendarClock} />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-6"><TableSkeleton rows={8} cols={6} /></div>
        ) : mortes.length === 0 ? (
          <div className="py-16 text-center">
            <Skull size={48} className="text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">Nenhuma morte registrada</p>
            <p className="text-slate-400 text-sm mt-1">Os registros de óbitos aparecerão aqui</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {['Animal','Proprietário','Denominação','Data Óbito','Causa','Registrado por',''].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {mortes.map((morte) => (
                  <tr key={morte.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {morte.animal.numero ? `Nº ${morte.animal.numero}` : `#${morte.animal.id}`}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{morte.animal.proprietario.name}</td>
                    <td className="px-4 py-3">
                      <Badge variant="denominacao" value={morte.animal.denominacao}>{morte.animal.denominacao}</Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {new Date(morte.dataObito).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{morte.causa ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{morte.registradoPor.name}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleDelete(morte.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
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

      <MorteDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSaved={fetchMortes}
        preAnimalId={preAnimalId ? parseInt(preAnimalId) : null}
      />
    </div>
  );
}
