'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Plus, Search, ChevronLeft, ChevronRight, Beef, Eye, Pencil, Trash2, Download } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { AnimalDrawer } from '@/components/animais/animal-drawer';
import { TableSkeleton } from '@/components/ui/skeleton';

interface Proprietario {
  id: number;
  name: string;
}

interface Animal {
  id: number;
  numero: string | null;
  genero: 'MACHO' | 'FEMEA';
  denominacao: string;
  eraMes: number | null;
  eraAno: number | null;
  peso: number | null;
  status: 'VIVO' | 'MORTO' | 'VENDIDO';
  reprodutor: boolean;
  observacoes: string | null;
  dataVenda: string | null;
  proprietarioId: number;
  proprietario: { id: number; name: string };
}

interface Props {
  proprietarios: Proprietario[];
  denominacoes: string[];
}

const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

export function AnimaisClient({ proprietarios, denominacoes }: Props) {
  const [animais, setAnimais] = useState<Animal[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editAnimal, setEditAnimal] = useState<Animal | null>(null);

  const [filters, setFilters] = useState({
    numero: '',
    proprietarioId: '',
    genero: '',
    denominacao: '',
    status: '',
    eraMes: '',
    eraAno: '',
  });

  const fetchAnimais = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });

      const res = await fetch(`/api/animais?${params}`);
      const data = await res.json();
      setAnimais(data.animais ?? []);
      setTotal(data.total ?? 0);
      setPages(data.pages ?? 1);
    } catch {
      toast.error('Erro ao carregar animais');
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => { fetchAnimais(); }, [fetchAnimais]);

  function handleFilterChange(key: string, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  }

  async function handleDelete(id: number) {
    if (!confirm('Deseja excluir este animal? Esta ação não pode ser desfeita.')) return;
    try {
      const res = await fetch(`/api/animais/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      toast.success('Animal excluído');
      fetchAnimais();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao excluir');
    }
  }

  function formatEra(eraMes: number | null, eraAno: number | null) {
    if (!eraAno) return '—';
    const mes = eraMes ? MESES[eraMes - 1] : '';
    return mes ? `${mes}/${eraAno}` : String(eraAno);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Beef size={24} className="text-brand-500" />
            Animais
          </h1>
          <p className="text-slate-500 text-sm mt-1">{total} animais cadastrados</p>
        </div>
        <div className="flex gap-2">
          <a
            href="/api/exportar"
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50 transition"
          >
            <Download size={16} />
            Exportar
          </a>
          <button
            onClick={() => { setEditAnimal(null); setDrawerOpen(true); }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold transition"
          >
            <Plus size={16} />
            Cadastrar Animal
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              placeholder="Número..."
              value={filters.numero}
              onChange={(e) => handleFilterChange('numero', e.target.value)}
              className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <select
            value={filters.proprietarioId}
            onChange={(e) => handleFilterChange('proprietarioId', e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-2 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
          >
            <option value="">Proprietário</option>
            {proprietarios.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>

          <select
            value={filters.genero}
            onChange={(e) => handleFilterChange('genero', e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-2 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
          >
            <option value="">Gênero</option>
            <option value="MACHO">Macho</option>
            <option value="FEMEA">Fêmea</option>
          </select>

          <select
            value={filters.denominacao}
            onChange={(e) => handleFilterChange('denominacao', e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-2 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
          >
            <option value="">Denominação</option>
            {denominacoes.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>

          <select
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-2 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
          >
            <option value="">Status</option>
            <option value="VIVO">Vivo</option>
            <option value="MORTO">Morto</option>
            <option value="VENDIDO">Vendido</option>
          </select>

          <select
            value={filters.eraMes}
            onChange={(e) => handleFilterChange('eraMes', e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-2 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
          >
            <option value="">Mês Nasc.</option>
            {MESES.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
          </select>

          <input
            type="number"
            placeholder="Ano Nasc."
            value={filters.eraAno}
            onChange={(e) => handleFilterChange('eraAno', e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-6"><TableSkeleton rows={8} cols={8} /></div>
        ) : animais.length === 0 ? (
          <div className="py-16 text-center">
            <Beef size={48} className="text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">Nenhum animal encontrado</p>
            <p className="text-slate-400 text-sm mt-1">Tente ajustar os filtros ou cadastre um novo animal</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {['ID','Número','Proprietário','Gênero','Denominação','Nascimento','Peso','Status','Ações'].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {animais.map((animal) => (
                  <tr key={animal.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-slate-500 text-xs">#{animal.id}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">{animal.numero ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-700">{animal.proprietario.name}</td>
                    <td className="px-4 py-3 text-slate-600 text-xs">{animal.genero === 'MACHO' ? 'Macho' : 'Fêmea'}</td>
                    <td className="px-4 py-3">
                      <Badge variant="denominacao" value={animal.denominacao}>{animal.denominacao}</Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-xs">{formatEra(animal.eraMes, animal.eraAno)}</td>
                    <td className="px-4 py-3 text-slate-600 text-xs">{animal.peso ? `${animal.peso} kg` : '—'}</td>
                    <td className="px-4 py-3">
                      <Badge variant="status" value={animal.status}>{animal.status === 'VIVO' ? 'Vivo' : animal.status === 'VENDIDO' ? 'Vendido' : 'Morto'}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Link
                          href={`/animais/${animal.id}`}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          title="Ver detalhes"
                        >
                          <Eye size={14} />
                        </Link>
                        <button
                          onClick={() => { setEditAnimal(animal); setDrawerOpen(true); }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                          title="Editar"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(animal.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="Excluir"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-slate-50">
            <p className="text-xs text-slate-500">Página {page} de {pages} · {total} resultados</p>
            <div className="flex gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg border border-slate-300 text-slate-600 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(pages, p + 1))}
                disabled={page === pages}
                className="p-1.5 rounded-lg border border-slate-300 text-slate-600 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      <AnimalDrawer
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setEditAnimal(null); }}
        animal={editAnimal}
        proprietarios={proprietarios}
        onSaved={fetchAnimais}
      />
    </div>
  );
}
