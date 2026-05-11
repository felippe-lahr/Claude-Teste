'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  Plus, Search, ChevronLeft, ChevronRight, Beef, Eye, Pencil, Trash2,
  Download, CheckSquare, X, AlertTriangle, Calendar, ClipboardList,
} from 'lucide-react';
import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';
import { Badge } from '@/components/ui/badge';
import { AnimalDrawer } from '@/components/animais/animal-drawer';
import { TableSkeleton } from '@/components/ui/skeleton';
import { DatePickerBR } from '@/components/ui/date-picker-br';

interface Proprietario { id: number; name: string }

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
  descarte?: boolean;
  observacoes: string | null;
  dataVenda: string | null;
  proprietarioId: number;
  proprietario: { id: number; name: string };
}

interface Props {
  proprietarios: Proprietario[];
  denominacoes: string[];
  minAno: number;
  maxAno: number;
  causasMorte: string[];
}

const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

function idxToLabel(idx: number) {
  const year = Math.floor(idx / 12);
  const month = idx % 12;
  return `${MESES[month]}/${year}`;
}

function idxToYearMonth(idx: number) {
  return { year: Math.floor(idx / 12), month: (idx % 12) + 1 };
}

type BatchModal = null | 'morto' | 'vendido' | 'delete';

export function AnimaisClient({ proprietarios, denominacoes, minAno, maxAno, causasMorte }: Props) {
  const sliderMin = minAno * 12;
  const sliderMax = maxAno * 12 + 11;

  const [animais, setAnimais] = useState<Animal[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editAnimal, setEditAnimal] = useState<Animal | null>(null);

  const [filters, setFilters] = useState({
    numero: '', proprietarioId: '', genero: '', denominacao: '', status: '', descarte: '',
  });

  // Slider state — null means not active
  const [sliderRange, setSliderRange] = useState<[number, number]>([sliderMin, sliderMax]);
  const [sliderActive, setSliderActive] = useState(false);

  // Batch selection
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [batchModal, setBatchModal] = useState<BatchModal>(null);
  const [batchDataObito, setBatchDataObito] = useState('');
  const [batchCausaMorte, setBatchCausaMorte] = useState('');
  const [batchDataVenda, setBatchDataVenda] = useState('');
  const [batchLoading, setBatchLoading] = useState(false);

  const fetchAnimais = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
      if (sliderActive) {
        params.set('eraMin', String(sliderRange[0]));
        params.set('eraMax', String(sliderRange[1]));
      }

      const res = await fetch(`/api/animais?${params}`);
      const data = await res.json();
      setAnimais(data.animais ?? []);
      setTotal(data.total ?? 0);
      setPages(data.pages ?? 1);
      setSelectedIds(new Set());
    } catch {
      toast.error('Erro ao carregar animais');
    } finally {
      setLoading(false);
    }
  }, [page, filters, sliderActive, sliderRange]);

  useEffect(() => { fetchAnimais(); }, [fetchAnimais]);

  function handleFilterChange(key: string, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  }

  async function handleDelete(id: number) {
    if (!confirm('Deseja excluir este animal? Esta ação não pode ser desfeita.')) return;
    try {
      const res = await fetch(`/api/animais/${id}`, { method: 'DELETE' });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error); }
      toast.success('Animal excluído');
      fetchAnimais();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao excluir');
    }
  }

  function toggleSelect(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === animais.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(animais.map((a) => a.id)));
    }
  }

  async function executeBatch(action: 'delete' | 'VIVO' | 'MORTO' | 'VENDIDO') {
    setBatchLoading(true);
    try {
      const body: Record<string, unknown> = { ids: Array.from(selectedIds) };
      if (action === 'delete') {
        body.action = 'delete';
      } else {
        body.status = action;
        if (action === 'MORTO') { body.dataObito = batchDataObito; body.causaMorte = batchCausaMorte; }
        if (action === 'VENDIDO') { body.dataVenda = batchDataVenda; }
      }
      const res = await fetch('/api/animais/batch', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      const data = await res.json();
      toast.success(`${data.count} animal(is) atualizados`);
      setBatchModal(null);
      setBatchDataObito(''); setBatchCausaMorte(''); setBatchDataVenda('');
      fetchAnimais();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro na operação em lote');
    } finally {
      setBatchLoading(false);
    }
  }

  function formatEra(eraMes: number | null, eraAno: number | null) {
    if (!eraAno) return '—';
    const mes = eraMes ? MESES[eraMes - 1] : '';
    return mes ? `${mes}/${eraAno}` : String(eraAno);
  }

  const allSelected = animais.length > 0 && selectedIds.size === animais.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < animais.length;

  return (
    <div className="space-y-6 pb-28">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Beef size={24} className="text-indigo-500" />
            Animais
          </h1>
          <p className="text-slate-500 text-sm mt-1">{total} animais cadastrados</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/log?tipo=CADASTRO,EDICAO,EXCLUSAO,LOTE"
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50 transition"
          >
            <ClipboardList size={16} />
            Ver Log
          </Link>
          <a
            href="/api/exportar"
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50 transition"
          >
            <Download size={16} />
            Exportar
          </a>
          <button
            onClick={() => { setEditAnimal(null); setDrawerOpen(true); }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition"
          >
            <Plus size={16} />
            Cadastrar Animal
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              placeholder="Número..."
              value={filters.numero}
              onChange={(e) => handleFilterChange('numero', e.target.value)}
              className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <select value={filters.proprietarioId} onChange={(e) => handleFilterChange('proprietarioId', e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500">
            <option value="">Proprietário</option>
            {proprietarios.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select value={filters.genero} onChange={(e) => handleFilterChange('genero', e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500">
            <option value="">Gênero</option>
            <option value="MACHO">Macho</option>
            <option value="FEMEA">Fêmea</option>
          </select>
          <select value={filters.denominacao} onChange={(e) => handleFilterChange('denominacao', e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500">
            <option value="">Denominação</option>
            {denominacoes.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <select value={filters.status} onChange={(e) => handleFilterChange('status', e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500">
            <option value="">Status</option>
            <option value="VIVO">Vivo</option>
            <option value="MORTO">Morto</option>
            <option value="VENDIDO">Vendido</option>
          </select>
          <select value={filters.descarte} onChange={(e) => handleFilterChange('descarte', e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500">
            <option value="">Descarte</option>
            <option value="true">Somente Descarte</option>
            <option value="false">Sem Descarte</option>
          </select>
        </div>

        {/* Birth range slider */}
        <div className="pt-1">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Calendar size={14} className="text-slate-400" />
              <span className="text-xs font-medium text-slate-600">Nascimento</span>
              {sliderActive && (
                <span className="text-xs text-indigo-600 font-semibold">
                  {idxToLabel(sliderRange[0])} → {idxToLabel(sliderRange[1])}
                </span>
              )}
            </div>
            <button
              onClick={() => { setSliderActive((v) => !v); setPage(1); }}
              className={`text-xs px-2.5 py-1 rounded-full border transition font-medium ${sliderActive ? 'bg-indigo-600 text-white border-indigo-600' : 'border-slate-300 text-slate-500 hover:border-indigo-400'}`}
            >
              {sliderActive ? 'Filtro ativo' : 'Filtrar por período'}
            </button>
          </div>

          {sliderActive && (
            <div className="px-2 pb-1" style={{ '--rc-slider-dot-border-color': 'transparent' } as React.CSSProperties}>
              <style>{`.rc-slider-dot { display: none !important; } .rc-slider-mark { display: none !important; }`}</style>
              <Slider
                range
                min={sliderMin}
                max={sliderMax}
                value={sliderRange}
                onChange={(v) => { setSliderRange(v as [number, number]); setPage(1); }}
                step={1}
                dots={false}
                styles={{
                  track: { backgroundColor: '#6366f1', height: 6, borderRadius: 3 },
                  rail: { backgroundColor: '#e2e8f0', height: 6, borderRadius: 3 },
                  handle: { borderColor: '#6366f1', borderWidth: 2, width: 18, height: 18, marginTop: -6, backgroundColor: '#fff', opacity: 1, boxShadow: '0 2px 6px rgba(99,102,241,.4)', cursor: 'pointer' },
                }}
              />
              {/* Manual year labels */}
              <div className="relative mt-3 h-4">
                {Array.from({ length: maxAno - minAno + 1 }, (_, i) => {
                  const year = minAno + i;
                  const pct = ((year * 12 - sliderMin) / (sliderMax - sliderMin)) * 100;
                  return (
                    <span
                      key={year}
                      style={{ left: `${Math.min(98, Math.max(2, pct))}%`, transform: 'translateX(-50%)' }}
                      className="absolute text-[10px] text-slate-400 select-none"
                    >
                      {year}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-6"><TableSkeleton rows={8} cols={9} /></div>
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
                  <th className="px-3 py-3 w-8">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      ref={(el) => { if (el) el.indeterminate = someSelected; }}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded border-slate-300 text-indigo-600 cursor-pointer"
                    />
                  </th>
                  {['ID','Número','Proprietário','Gênero','Denominação','Nascimento','Peso','Status','Ações'].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {animais.map((animal) => (
                  <tr
                    key={animal.id}
                    className={`hover:bg-slate-50 transition-colors ${selectedIds.has(animal.id) ? 'bg-indigo-50' : ''}`}
                  >
                    <td className="px-3 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(animal.id)}
                        onChange={() => toggleSelect(animal.id)}
                        className="w-4 h-4 rounded border-slate-300 text-indigo-600 cursor-pointer"
                      />
                    </td>
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
                      {animal.descarte && <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">Descarte</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Link href={`/animais/${animal.id}`} className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" title="Ver detalhes">
                          <Eye size={14} />
                        </Link>
                        <button onClick={() => { setEditAnimal(animal); setDrawerOpen(true); }} className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors" title="Editar">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => handleDelete(animal.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="Excluir">
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
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 rounded-lg border border-slate-300 text-slate-600 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition">
                <ChevronLeft size={14} />
              </button>
              <button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page === pages} className="p-1.5 rounded-lg border border-slate-300 text-slate-600 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition">
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

      {/* Floating batch action bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-slate-700">
          <CheckSquare size={16} className="text-indigo-400 shrink-0" />
          <span className="text-sm font-medium whitespace-nowrap">{selectedIds.size} selecionado{selectedIds.size > 1 ? 's' : ''}</span>
          <div className="w-px h-4 bg-slate-600" />
          <div className="flex items-center gap-2">
            <button onClick={() => executeBatch('VIVO')} disabled={batchLoading} className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition disabled:opacity-50">Vivo</button>
            <button onClick={() => { setBatchModal('morto'); }} disabled={batchLoading} className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition disabled:opacity-50">Morto</button>
            <button onClick={() => { setBatchModal('vendido'); }} disabled={batchLoading} className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold transition disabled:opacity-50">Vendido</button>
            <button onClick={() => setBatchModal('delete')} disabled={batchLoading} className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold transition disabled:opacity-50">
              <Trash2 size={13} />
            </button>
          </div>
          <div className="w-px h-4 bg-slate-600" />
          <button onClick={() => setSelectedIds(new Set())} className="text-slate-400 hover:text-white transition">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Batch modal — Morto */}
      {batchModal === 'morto' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <h3 className="font-semibold text-slate-900">Registrar Óbito — {selectedIds.size} animal(is)</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Data do Óbito <span className="text-red-500">*</span></label>
                <DatePickerBR
                  value={batchDataObito}
                  onChange={(v) => setBatchDataObito(v ?? '')}
                  placeholder="dd/mm/aaaa"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Causa da Morte</label>
                {causasMorte.length > 0 ? (
                  <select value={batchCausaMorte} onChange={(e) => setBatchCausaMorte(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-red-500">
                    <option value="">Selecione...</option>
                    {causasMorte.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                ) : (
                  <input value={batchCausaMorte} onChange={(e) => setBatchCausaMorte(e.target.value)} placeholder="Ex: Doença respiratória" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-red-500" />
                )}
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setBatchModal(null)} className="flex-1 py-2 rounded-lg border border-slate-300 text-sm text-slate-600 hover:bg-slate-50 transition">Cancelar</button>
              <button onClick={() => executeBatch('MORTO')} disabled={!batchDataObito || batchLoading} className="flex-1 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition disabled:opacity-50">
                {batchLoading ? 'Salvando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Batch modal — Vendido */}
      {batchModal === 'vendido' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <h3 className="font-semibold text-slate-900">Registrar Venda — {selectedIds.size} animal(is)</h3>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Data da Venda</label>
              <DatePickerBR
                value={batchDataVenda}
                onChange={(v) => setBatchDataVenda(v ?? '')}
                placeholder="dd/mm/aaaa"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setBatchModal(null)} className="flex-1 py-2 rounded-lg border border-slate-300 text-sm text-slate-600 hover:bg-slate-50 transition">Cancelar</button>
              <button onClick={() => executeBatch('VENDIDO')} disabled={batchLoading} className="flex-1 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold transition disabled:opacity-50">
                {batchLoading ? 'Salvando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Batch modal — Delete */}
      {batchModal === 'delete' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-red-100">
                <AlertTriangle size={20} className="text-red-600" />
              </div>
              <h3 className="font-semibold text-slate-900">Excluir {selectedIds.size} animal(is)?</h3>
            </div>
            <p className="text-sm text-slate-500">Esta ação não pode ser desfeita. Todos os registros associados (vacinas, reprodução, morte) também serão excluídos.</p>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setBatchModal(null)} className="flex-1 py-2 rounded-lg border border-slate-300 text-sm text-slate-600 hover:bg-slate-50 transition">Cancelar</button>
              <button onClick={() => executeBatch('delete')} disabled={batchLoading} className="flex-1 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition disabled:opacity-50">
                {batchLoading ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
