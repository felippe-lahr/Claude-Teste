'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  Plus, Search, ChevronLeft, ChevronRight, Tag, Eye, Pencil, Trash2,
  Download, CheckSquare, X, AlertTriangle, Calendar, ClipboardList, Package, FileText,
} from 'lucide-react';
import { NovoLoteWizard } from '@/components/lotes/novo-lote-wizard';
import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';
import { Badge } from '@/components/ui/badge';
import { AnimalDrawer } from '@/components/animais/animal-drawer';
import { TableSkeleton } from '@/components/ui/skeleton';
import { DatePickerBR } from '@/components/ui/date-picker-br';
import { calcularEstagioAtual, DEFAULT_PRENHEZ_CONFIGS } from '@/lib/prenhez';

interface Proprietario { id: number; name: string }

interface LatestRepro {
  statusReprodutivo: string | null;
  estagioPrenhez: string | null;
  dataToque: string | null;
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
  descarte?: boolean;
  observacoes: string | null;
  dataVenda: string | null;
  proprietarioId: number;
  proprietario: { id: number; name: string };
  reproducoes?: LatestRepro[];
}

const PRENHEZ_BADGE: Record<string, string> = {
  P1: 'bg-yellow-100 text-yellow-800',
  P2: 'bg-orange-100 text-orange-800',
  P3: 'bg-green-100 text-green-800',
};

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

type BatchModal = null | 'morto' | 'vendido' | 'delete' | 'lote';

export function AnimaisClient({ proprietarios, denominacoes, minAno, maxAno, causasMorte }: Props) {
  const sliderMin = minAno * 12;
  const sliderMax = maxAno * 12 + 11;

  const [animais, setAnimais] = useState<Animal[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [limit, setLimit] = useState(20);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editAnimal, setEditAnimal] = useState<Animal | null>(null);

  const [filters, setFilters] = useState({
    numero: '', proprietarioId: '', genero: '', status: '', descarte: '',
  });
  const [denominacoesSel, setDenominacoesSel] = useState<string[]>([]);
  const [denomDropOpen, setDenomDropOpen] = useState(false);
  const denomDropRef = useRef<HTMLDivElement>(null);

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
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
      if (denominacoesSel.length > 0) params.set('denominacoes', denominacoesSel.join(','));
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
  }, [page, limit, filters, denominacoesSel, sliderActive, sliderRange]);

  useEffect(() => { fetchAnimais(); }, [fetchAnimais]);

  function handleFilterChange(key: string, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  }

  function handleDownloadPDF() {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
    if (denominacoesSel.length > 0) params.set('denominacoes', denominacoesSel.join(','));
    if (sliderActive) {
      params.set('eraMin', String(sliderRange[0]));
      params.set('eraMax', String(sliderRange[1]));
    }
    window.open(`/api/animais/relatorio?${params}`, '_blank');
  }

  // Close denominação dropdown when clicking outside
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (denomDropRef.current && !denomDropRef.current.contains(e.target as Node)) {
        setDenomDropOpen(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

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
          <h1 className="text-2xl font-bold text-[#111110] flex items-center gap-2">
            <Tag size={24} className="text-[#2F6A47]" />
            Animais
          </h1>
          <p className="text-[#6B6B65] text-sm mt-1">{total} animais cadastrados</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/log?tipo=CADASTRO,EDICAO,EXCLUSAO,LOTE"
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[#E8E8E3] text-[#6B6B65] text-sm font-medium hover:bg-[#F5F4EF] transition"
          >
            <ClipboardList size={16} />
            Ver Log
          </Link>
          <a
            href="/api/exportar"
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[#E8E8E3] text-[#6B6B65] text-sm font-medium hover:bg-[#F5F4EF] transition"
          >
            <Download size={16} />
            Exportar
          </a>
          <button
            onClick={handleDownloadPDF}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[#E8E8E3] text-[#6B6B65] text-sm font-medium hover:bg-[#F5F4EF] transition"
            title={`Gerar relatório PDF com os filtros atuais (${total} animais)`}
          >
            <FileText size={16} />
            Relatório PDF
          </button>
          <button
            onClick={() => { setEditAnimal(null); setDrawerOpen(true); }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#2F6A47] hover:bg-[#255840] text-white text-sm font-semibold transition"
          >
            <Plus size={16} />
            Cadastrar Animal
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-[#E8E8E3] p-4 shadow-sm space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#A8A8A2]" />
            <input
              placeholder="Número..."
              value={filters.numero}
              onChange={(e) => handleFilterChange('numero', e.target.value)}
              className="w-full pl-8 pr-3 py-2 bg-[#F5F4EF] border border-[#E8E8E3] rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#2F6A47] focus:border-[#2F6A47]"
            />
          </div>
          <select value={filters.proprietarioId} onChange={(e) => handleFilterChange('proprietarioId', e.target.value)} className="w-full bg-[#F5F4EF] border border-[#E8E8E3] rounded-lg px-2 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#2F6A47]">
            <option value="">Proprietário</option>
            {proprietarios.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select value={filters.genero} onChange={(e) => handleFilterChange('genero', e.target.value)} className="w-full bg-[#F5F4EF] border border-[#E8E8E3] rounded-lg px-2 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#2F6A47]">
            <option value="">Gênero</option>
            <option value="MACHO">Macho</option>
            <option value="FEMEA">Fêmea</option>
          </select>
          {/* Multi-select denominação */}
          <div ref={denomDropRef} className="relative w-full">
            <button
              type="button"
              onClick={() => setDenomDropOpen((o) => !o)}
              className="w-full bg-[#F5F4EF] border border-[#E8E8E3] rounded-lg px-2 py-2 text-xs text-left flex items-center justify-between gap-1 focus:outline-none focus:ring-1 focus:ring-[#2F6A47]"
            >
              <span className={denominacoesSel.length === 0 ? 'text-[#9B9B93]' : 'text-[#3D3D37] font-medium'}>
                {denominacoesSel.length === 0
                  ? 'Denominação'
                  : denominacoesSel.length === 1
                    ? denominacoesSel[0]
                    : `${denominacoesSel.length} selecionadas`}
              </span>
              <svg className={`w-3 h-3 text-[#9B9B93] shrink-0 transition-transform ${denomDropOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>
            {denomDropOpen && (
              <div className="absolute z-50 top-full left-0 mt-1 w-full min-w-[180px] bg-white border border-[#E8E8E3] rounded-lg shadow-lg py-1 max-h-60 overflow-y-auto">
                {denominacoesSel.length > 0 && (
                  <button
                    type="button"
                    onClick={() => { setDenominacoesSel([]); setPage(1); }}
                    className="w-full text-left px-3 py-1.5 text-xs text-red-500 hover:bg-red-50 border-b border-[#E8E8E3]"
                  >
                    Limpar seleção
                  </button>
                )}
                {denominacoes.map((d) => {
                  const checked = denominacoesSel.includes(d);
                  return (
                    <label key={d} className="flex items-center gap-2 px-3 py-1.5 text-xs text-[#3D3D37] hover:bg-[#F5F4EF] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          setDenominacoesSel((prev) =>
                            checked ? prev.filter((x) => x !== d) : [...prev, d]
                          );
                          setPage(1);
                        }}
                        className="accent-[#2F6A47] w-3.5 h-3.5 rounded"
                      />
                      {d}
                    </label>
                  );
                })}
              </div>
            )}
          </div>
          <select value={filters.status} onChange={(e) => handleFilterChange('status', e.target.value)} className="w-full bg-[#F5F4EF] border border-[#E8E8E3] rounded-lg px-2 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#2F6A47]">
            <option value="">Status</option>
            <option value="VIVO">Vivo</option>
            <option value="MORTO">Morto</option>
            <option value="VENDIDO">Vendido</option>
          </select>
          <select value={filters.descarte} onChange={(e) => handleFilterChange('descarte', e.target.value)} className="w-full bg-[#F5F4EF] border border-[#E8E8E3] rounded-lg px-2 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#2F6A47]">
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
                <span className="text-xs text-[#2F6A47] font-semibold">
                  {idxToLabel(sliderRange[0])} → {idxToLabel(sliderRange[1])}
                </span>
              )}
            </div>
            <button
              onClick={() => { setSliderActive((v) => !v); setPage(1); }}
              className={`text-xs px-2.5 py-1 rounded-full border transition font-medium ${sliderActive ? 'bg-[#2F6A47] text-white border-[#2F6A47]' : 'border-[#E8E8E3] text-[#6B6B65] hover:border-[#2F6A47]'}`}
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
                  track: { backgroundColor: '#2F6A47', height: 6, borderRadius: 3 },
                  rail: { backgroundColor: '#E8E8E3', height: 6, borderRadius: 3 },
                  handle: { borderColor: '#2F6A47', borderWidth: 2, width: 18, height: 18, marginTop: -6, backgroundColor: '#fff', opacity: 1, boxShadow: '0 2px 6px rgba(47,106,71,.4)', cursor: 'pointer' },
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
                      className="absolute text-[10px] text-[#A8A8A2] select-none"
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
      <div className="bg-white rounded-xl border border-[#E8E8E3] shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-6"><TableSkeleton rows={8} cols={9} /></div>
        ) : animais.length === 0 ? (
          <div className="py-16 text-center">
            <Tag size={48} className="text-[#A8A8A2] mx-auto mb-3" />
            <p className="text-[#6B6B65] font-medium">Nenhum animal encontrado</p>
            <p className="text-[#A8A8A2] text-sm mt-1">Tente ajustar os filtros ou cadastre um novo animal</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#F5F4EF] border-b border-[#E8E8E3]">
                <tr>
                  <th className="px-3 py-3 w-8">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      ref={(el) => { if (el) el.indeterminate = someSelected; }}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded border-[#E8E8E3] text-[#2F6A47] cursor-pointer"
                    />
                  </th>
                  {['ID','Número','Proprietário','Gênero','Denominação','Nascimento','Peso','Status','Ações'].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-[#6B6B65] uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E8E3]">
                {animais.map((animal) => (
                  <tr
                    key={animal.id}
                    className={`hover:bg-[#F5F4EF] transition-colors ${selectedIds.has(animal.id) ? 'bg-[#EDF7F1]' : ''}`}
                  >
                    <td className="px-3 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(animal.id)}
                        onChange={() => toggleSelect(animal.id)}
                        className="w-4 h-4 rounded border-[#E8E8E3] text-[#2F6A47] cursor-pointer"
                      />
                    </td>
                    <td className="px-4 py-3 text-[#A8A8A2] text-xs">#{animal.id}</td>
                    <td className="px-4 py-3 font-medium text-[#111110]">{animal.numero ?? '—'}</td>
                    <td className="px-4 py-3 text-[#6B6B65]">{animal.proprietario.name}</td>
                    <td className="px-4 py-3 text-xs"><Badge variant="genero" value={animal.genero}>{animal.genero === 'MACHO' ? 'Macho' : 'Fêmea'}</Badge></td>
                    <td className="px-4 py-3">
                      <Badge variant="denominacao" value={animal.denominacao}>{animal.denominacao}</Badge>
                    </td>
                    <td className="px-4 py-3 text-[#6B6B65] text-xs">{formatEra(animal.eraMes, animal.eraAno)}</td>
                    <td className="px-4 py-3 text-[#6B6B65] text-xs">{animal.peso ? `${animal.peso} kg` : '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 flex-wrap">
                        <Badge variant="status" value={animal.status}>{animal.status === 'VIVO' ? 'Vivo' : animal.status === 'VENDIDO' ? 'Vendido' : 'Morto'}</Badge>
                        {animal.descarte && <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">Descarte</span>}
                        {(() => {
                          const repro = animal.reproducoes?.[0];
                          if (repro?.statusReprodutivo === 'CHEIA' && repro.estagioPrenhez) {
                            const estagio = repro.dataToque
                              ? calcularEstagioAtual(repro.estagioPrenhez, new Date(repro.dataToque), DEFAULT_PRENHEZ_CONFIGS)
                              : (repro.estagioPrenhez as 'P1' | 'P2' | 'P3');
                            return (
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${PRENHEZ_BADGE[estagio] ?? ''}`}>
                                {estagio}
                              </span>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Link href={`/animais/${animal.id}`} className="p-1.5 rounded-lg text-[#A8A8A2] hover:text-[#1B58A3] hover:bg-[#EEF3FB] transition-colors" title="Ver detalhes">
                          <Eye size={14} />
                        </Link>
                        <button onClick={() => { setEditAnimal(animal); setDrawerOpen(true); }} className="p-1.5 rounded-lg text-[#A8A8A2] hover:text-[#2F6A47] hover:bg-[#EDF7F1] transition-colors" title="Editar">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => handleDelete(animal.id)} className="p-1.5 rounded-lg text-[#A8A8A2] hover:text-[#9B3A2A] hover:bg-[#FBF0EE] transition-colors" title="Excluir">
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
        <div className="flex items-center justify-between px-4 py-3 border-t border-[#E8E8E3] bg-[#F5F4EF]">
          <p className="text-xs text-[#6B6B65]">Página {page} de {pages} · {total} resultados</p>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-[#6B6B65]">Por página:</span>
              {[20, 50, 100, 200].map((n) => (
                <button
                  key={n}
                  onClick={() => { setLimit(n); setPage(1); }}
                  className={`px-2 py-1 rounded text-xs font-medium transition border ${limit === n ? 'bg-[#2F6A47] text-white border-[#2F6A47]' : 'border-[#E8E8E3] text-[#6B6B65] hover:bg-white'}`}
                >
                  {n}
                </button>
              ))}
            </div>
            <div className="flex gap-1">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 rounded-lg border border-[#E8E8E3] text-[#6B6B65] hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition">
                <ChevronLeft size={14} />
              </button>
              <button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page === pages} className="p-1.5 rounded-lg border border-[#E8E8E3] text-[#6B6B65] hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition">
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
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
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-[#111110] text-white px-5 py-3 rounded-2xl shadow-2xl border border-[#2A2A28]">
          <CheckSquare size={16} className="text-[#2F6A47] shrink-0" />
          <span className="text-sm font-medium whitespace-nowrap">{selectedIds.size} selecionado{selectedIds.size > 1 ? 's' : ''}</span>
          <div className="w-px h-4 bg-[#2A2A28]" />
          <div className="flex items-center gap-2">
            <button onClick={() => executeBatch('VIVO')} disabled={batchLoading} className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition disabled:opacity-50">Vivo</button>
            <button onClick={() => { setBatchModal('morto'); }} disabled={batchLoading} className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition disabled:opacity-50">Morto</button>
            <button onClick={() => { setBatchModal('vendido'); }} disabled={batchLoading} className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold transition disabled:opacity-50">Vendido</button>
            <button onClick={() => setBatchModal('lote')} disabled={batchLoading} className="px-3 py-1.5 rounded-lg bg-[#2F6A47] hover:bg-[#255840] text-white text-xs font-semibold transition disabled:opacity-50 flex items-center gap-1.5">
              <Package size={12} />
              Criar Lote
            </button>
            <button onClick={() => setBatchModal('delete')} disabled={batchLoading} className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold transition disabled:opacity-50">
              <Trash2 size={13} />
            </button>
          </div>
          <div className="w-px h-4 bg-[#2A2A28]" />
          <button onClick={() => setSelectedIds(new Set())} className="text-[#A8A8A2] hover:text-white transition">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Batch modal — Morto */}
      {batchModal === 'morto' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <h3 className="font-semibold text-[#111110]">Registrar Óbito — {selectedIds.size} animal(is)</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-[#111110] mb-1">Data do Óbito <span className="text-red-500">*</span></label>
                <DatePickerBR
                  value={batchDataObito}
                  onChange={(v) => setBatchDataObito(v ?? '')}
                  placeholder="dd/mm/aaaa"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#111110] mb-1">Causa da Morte</label>
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
              <button onClick={() => setBatchModal(null)} className="flex-1 py-2 rounded-lg border border-[#E8E8E3] text-sm text-[#6B6B65] hover:bg-[#F5F4EF] transition">Cancelar</button>
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
            <h3 className="font-semibold text-[#111110]">Registrar Venda — {selectedIds.size} animal(is)</h3>
            <div>
              <label className="block text-xs font-medium text-[#111110] mb-1">Data da Venda</label>
              <DatePickerBR
                value={batchDataVenda}
                onChange={(v) => setBatchDataVenda(v ?? '')}
                placeholder="dd/mm/aaaa"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setBatchModal(null)} className="flex-1 py-2 rounded-lg border border-[#E8E8E3] text-sm text-[#6B6B65] hover:bg-[#F5F4EF] transition">Cancelar</button>
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
              <h3 className="font-semibold text-[#111110]">Excluir {selectedIds.size} animal(is)?</h3>
            </div>
            <p className="text-sm text-[#6B6B65]">Esta ação não pode ser desfeita. Todos os registros associados (vacinas, reprodução, morte) também serão excluídos.</p>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setBatchModal(null)} className="flex-1 py-2 rounded-lg border border-[#E8E8E3] text-sm text-[#6B6B65] hover:bg-[#F5F4EF] transition">Cancelar</button>
              <button onClick={() => executeBatch('delete')} disabled={batchLoading} className="flex-1 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition disabled:opacity-50">
                {batchLoading ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}

      {batchModal === 'lote' && (
        <NovoLoteWizard
          initialSelectedIds={Array.from(selectedIds)}
          onClose={() => setBatchModal(null)}
          onSaved={() => { setBatchModal(null); setSelectedIds(new Set()); fetchAnimais(); }}
        />
      )}
    </div>
  );
}
