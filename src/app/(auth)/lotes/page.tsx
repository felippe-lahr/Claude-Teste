'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import {
  Package, Plus, ChevronDown, ChevronUp, Pencil, Trash2,
  CheckCircle2, Clock, ShoppingCart, Filter, X, Scale, DollarSign,
} from 'lucide-react';
import { DatePickerBR } from '@/components/ui/date-picker-br';
import { parseDateBR, formatDateBR } from '@/lib/utils';

// ── Types ────────────────────────────────────────────────────────────────────

type StatusLote = 'ABERTO' | 'EM_NEGOCIACAO' | 'VENDIDO';

interface AnimalBasico {
  id: number;
  numero: string | null;
  denominacao: string;
  genero: 'MACHO' | 'FEMEA';
  peso: number | null;
  status: string;
  descarte: boolean;
  proprietario: { id: number; name: string };
}

interface LoteItem { animal: AnimalBasico }

interface Lote {
  id: number;
  nome: string;
  status: StatusLote;
  dataFechamento: string | null;
  comprador: string | null;
  valorTotal: number | null;
  pesoTotal: number | null;
  notaFiscal: string | null;
  gta: string | null;
  observacoes: string | null;
  criadoPor: { name: string };
  animais: LoteItem[];
  createdAt: string;
}

interface AnimalFiltro {
  id: number;
  numero: string | null;
  denominacao: string;
  genero: 'MACHO' | 'FEMEA';
  peso: number | null;
  status: string;
  descarte: boolean;
  proprietario: { id: number; name: string };
}

interface Proprietario { id: number; name: string }

// ── Constants ────────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<StatusLote, string> = {
  ABERTO: 'Aberto',
  EM_NEGOCIACAO: 'Em Negociação',
  VENDIDO: 'Vendido',
};

const STATUS_COLOR: Record<StatusLote, string> = {
  ABERTO: 'bg-blue-100 text-blue-700',
  EM_NEGOCIACAO: 'bg-amber-100 text-amber-700',
  VENDIDO: 'bg-emerald-100 text-emerald-700',
};

const STATUS_ICON: Record<StatusLote, React.ReactNode> = {
  ABERTO: <Clock size={12} />,
  EM_NEGOCIACAO: <ShoppingCart size={12} />,
  VENDIDO: <CheckCircle2 size={12} />,
};

const fmtBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtKg  = (v: number) => `${v.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} kg`;

// ── Component ────────────────────────────────────────────────────────────────

export default function LotesPage() {
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState<StatusLote | ''>('');

  // Edit modal
  const [editLote, setEditLote] = useState<Lote | null>(null);
  const [editLoading, setEditLoading] = useState(false);

  // New lot wizard
  const [showWizard, setShowWizard] = useState(false);

  const fetchLotes = useCallback(async () => {
    setLoading(true);
    try {
      const params = filterStatus ? `?status=${filterStatus}` : '';
      const res = await fetch(`/api/lotes${params}`);
      setLotes(await res.json());
    } catch { toast.error('Erro ao carregar lotes'); }
    finally { setLoading(false); }
  }, [filterStatus]);

  useEffect(() => { fetchLotes(); }, [fetchLotes]);

  async function advanceStatus(lote: Lote) {
    const next: Record<StatusLote, StatusLote | null> = {
      ABERTO: 'EM_NEGOCIACAO',
      EM_NEGOCIACAO: 'VENDIDO',
      VENDIDO: null,
    };
    const novoStatus = next[lote.status];
    if (!novoStatus) return;
    if (novoStatus === 'VENDIDO' && !confirm(`Confirmar venda do lote "${lote.nome}"?\n\nTodos os ${lote.animais.length} animais serão marcados como VENDIDOS.`)) return;
    try {
      const res = await fetch(`/api/lotes/${lote.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: novoStatus }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success(novoStatus === 'VENDIDO' ? `Lote vendido! ${lote.animais.length} animais atualizados.` : 'Status atualizado.');
      fetchLotes();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Erro'); }
  }

  async function deleteLote(lote: Lote) {
    if (!confirm(`Excluir o lote "${lote.nome}"?`)) return;
    try {
      const res = await fetch(`/api/lotes/${lote.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success('Lote excluído.');
      fetchLotes();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Erro'); }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Package size={24} className="text-indigo-500" />
            Lotes de Animais
          </h1>
          <p className="text-slate-500 text-sm mt-1">{lotes.length} lote(s)</p>
        </div>
        <button
          onClick={() => setShowWizard(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition"
        >
          <Plus size={16} />
          Novo Lote
        </button>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <Filter size={14} className="text-slate-400" />
        {(['', 'ABERTO', 'EM_NEGOCIACAO', 'VENDIDO'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${filterStatus === s ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            {s === '' ? 'Todos' : STATUS_LABEL[s]}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="py-16 text-center text-slate-400">Carregando...</div>
      ) : lotes.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-xl border border-slate-200">
          <Package size={48} className="text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">Nenhum lote encontrado</p>
          <p className="text-slate-400 text-sm mt-1">Clique em &quot;Novo Lote&quot; para começar</p>
        </div>
      ) : (
        <div className="space-y-3">
          {lotes.map((lote) => {
            const isExpanded = expandedId === lote.id;
            const totalPeso = lote.pesoTotal ?? lote.animais.reduce((s, i) => s + (i.animal.peso ?? 0), 0);
            const mediaKg = lote.valorTotal && totalPeso > 0 ? lote.valorTotal / totalPeso : null;
            const mediaCabeca = lote.valorTotal ? lote.valorTotal / lote.animais.length : null;
            return (
              <div key={lote.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                {/* Row */}
                <div className="px-5 py-4 flex items-center gap-4 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : lote.id)}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-slate-900">{lote.nome}</span>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR[lote.status]}`}>
                        {STATUS_ICON[lote.status]}
                        {STATUS_LABEL[lote.status]}
                      </span>
                      {lote.animais.some((i) => i.animal.descarte) && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">Contém Descarte</span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-xs text-slate-500 flex-wrap">
                      <span>{lote.animais.length} animal(is)</span>
                      {lote.comprador && <span>Comprador: <span className="font-medium text-slate-700">{lote.comprador}</span></span>}
                      {lote.dataFechamento && <span>Data: {formatDateBR(lote.dataFechamento)}</span>}
                      {lote.valorTotal && <span className="text-emerald-700 font-semibold">{fmtBRL(lote.valorTotal)}</span>}
                      {totalPeso > 0 && <span className="flex items-center gap-1"><Scale size={11} />{fmtKg(totalPeso)}</span>}
                    </div>
                    {(mediaKg || mediaCabeca) && (
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-400">
                        {mediaCabeca && <span>Média/cabeça: {fmtBRL(mediaCabeca)}</span>}
                        {mediaKg && <span>Média/kg: {fmtBRL(mediaKg)}</span>}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {lote.status !== 'VENDIDO' && (
                      <button
                        onClick={(e) => { e.stopPropagation(); advanceStatus(lote); }}
                        className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition"
                      >
                        {lote.status === 'ABERTO' ? 'Em Negociação →' : 'Fechar Venda ✓'}
                      </button>
                    )}
                    <button onClick={(e) => { e.stopPropagation(); setEditLote(lote); }} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition">
                      <Pencil size={14} />
                    </button>
                    {lote.status !== 'VENDIDO' && (
                      <button onClick={(e) => { e.stopPropagation(); deleteLote(lote); }} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 transition">
                        <Trash2 size={14} />
                      </button>
                    )}
                    {isExpanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                  </div>
                </div>

                {/* Expanded animals */}
                {isExpanded && (
                  <div className="border-t border-slate-100 px-5 py-3">
                    {lote.notaFiscal || lote.gta ? (
                      <div className="flex gap-4 text-xs text-slate-500 mb-3">
                        {lote.notaFiscal && <span>NF: <span className="font-medium text-slate-700">{lote.notaFiscal}</span></span>}
                        {lote.gta && <span>GTA: <span className="font-medium text-slate-700">{lote.gta}</span></span>}
                      </div>
                    ) : null}
                    {lote.observacoes && <p className="text-xs text-slate-500 mb-3 italic">{lote.observacoes}</p>}
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-left text-slate-400 border-b border-slate-100">
                            <th className="pb-2 pr-4">Nº</th>
                            <th className="pb-2 pr-4">Denominação</th>
                            <th className="pb-2 pr-4">Proprietário</th>
                            <th className="pb-2 pr-4">Gênero</th>
                            <th className="pb-2 pr-4">Peso (kg)</th>
                            <th className="pb-2">Flags</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {lote.animais.map(({ animal }) => (
                            <tr key={animal.id}>
                              <td className="py-1.5 pr-4 font-medium text-slate-700">{animal.numero ?? '—'}</td>
                              <td className="py-1.5 pr-4 text-slate-600">{animal.denominacao}</td>
                              <td className="py-1.5 pr-4 text-slate-500">{animal.proprietario.name}</td>
                              <td className="py-1.5 pr-4 text-slate-500">{animal.genero === 'MACHO' ? 'Macho' : 'Fêmea'}</td>
                              <td className="py-1.5 pr-4 text-slate-600">{animal.peso ? `${animal.peso} kg` : '—'}</td>
                              <td className="py-1.5">
                                {animal.descarte && <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-medium">Descarte</span>}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <p className="text-xs text-slate-400 mt-2">Criado por {lote.criadoPor.name}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Modal */}
      {editLote && (
        <EditLoteModal
          lote={editLote}
          onClose={() => setEditLote(null)}
          onSaved={() => { setEditLote(null); fetchLotes(); }}
          loading={editLoading}
          setLoading={setEditLoading}
        />
      )}

      {/* New Lot Wizard */}
      {showWizard && (
        <NovoLoteWizard onClose={() => setShowWizard(false)} onSaved={() => { setShowWizard(false); fetchLotes(); }} />
      )}
    </div>
  );
}

// ── Edit Modal ────────────────────────────────────────────────────────────────

function EditLoteModal({ lote, onClose, onSaved, loading, setLoading }: {
  lote: Lote;
  onClose: () => void;
  onSaved: () => void;
  loading: boolean;
  setLoading: (v: boolean) => void;
}) {
  const [nome, setNome] = useState(lote.nome);
  const [dataFechamento, setDataFechamento] = useState(lote.dataFechamento ? formatDateBR(lote.dataFechamento) : '');
  const [comprador, setComprador] = useState(lote.comprador ?? '');
  const [valorTotal, setValorTotal] = useState(lote.valorTotal ? String(lote.valorTotal) : '');
  const [pesoTotal, setPesoTotal] = useState(lote.pesoTotal ? String(lote.pesoTotal) : '');
  const [notaFiscal, setNotaFiscal] = useState(lote.notaFiscal ?? '');
  const [gta, setGta] = useState(lote.gta ?? '');
  const [observacoes, setObservacoes] = useState(lote.observacoes ?? '');

  async function save() {
    setLoading(true);
    try {
      const dt = dataFechamento ? (parseDateBR(dataFechamento) ?? new Date(dataFechamento)) : null;
      const res = await fetch(`/api/lotes/${lote.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, dataFechamento: dt?.toISOString() ?? null, comprador, valorTotal: valorTotal || null, pesoTotal: pesoTotal || null, notaFiscal, gta, observacoes }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success('Lote atualizado.');
      onSaved();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Erro'); }
    finally { setLoading(false); }
  }

  const inputCls = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="font-semibold text-slate-900">Editar Lote</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100"><X size={16} /></button>
        </div>
        <div className="px-6 py-5 space-y-3 max-h-[70vh] overflow-y-auto">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Nome do Lote *</label>
            <input value={nome} onChange={(e) => setNome(e.target.value)} className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Data de Fechamento</label>
              <DatePickerBR value={dataFechamento || null} onChange={(v) => setDataFechamento(v ?? '')} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Comprador</label>
              <input value={comprador} onChange={(e) => setComprador(e.target.value)} className={inputCls} placeholder="Nome do comprador" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1"><DollarSign size={11} />Valor Total (R$)</label>
              <input type="number" step="0.01" value={valorTotal} onChange={(e) => setValorTotal(e.target.value)} className={inputCls} placeholder="Ex: 45000.00" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1"><Scale size={11} />Peso Total (kg)</label>
              <input type="number" step="0.1" value={pesoTotal} onChange={(e) => setPesoTotal(e.target.value)} className={inputCls} placeholder="Ex: 1250.0" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Nota Fiscal (NF)</label>
              <input value={notaFiscal} onChange={(e) => setNotaFiscal(e.target.value)} className={inputCls} placeholder="Nº da NF" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">GTA</label>
              <input value={gta} onChange={(e) => setGta(e.target.value)} className={inputCls} placeholder="Nº do GTA" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Observações</label>
            <textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} rows={2} className={inputCls + ' resize-none'} />
          </div>
        </div>
        <div className="px-6 py-4 border-t flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-sm hover:bg-slate-50 transition">Cancelar</button>
          <button onClick={save} disabled={loading || !nome} className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition disabled:opacity-50">
            {loading ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Novo Lote Wizard ──────────────────────────────────────────────────────────

function NovoLoteWizard({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [step, setStep] = useState<1 | 2>(1);
  const [animais, setAnimais] = useState<AnimalFiltro[]>([]);
  const [proprietarios, setProprietarios] = useState<Proprietario[]>([]);
  const [loadingAnimais, setLoadingAnimais] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  // Filters
  const [filtros, setFiltros] = useState({ numero: '', proprietarioId: '', genero: '', denominacao: '', descarte: '' });

  // Lote form
  const [nome, setNome] = useState('');
  const [dataFechamento, setDataFechamento] = useState('');
  const [comprador, setComprador] = useState('');
  const [valorTotal, setValorTotal] = useState('');
  const [pesoTotal, setPesoTotal] = useState('');
  const [notaFiscal, setNotaFiscal] = useState('');
  const [gta, setGta] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/users').then((r) => r.json()).then(setProprietarios).catch(() => {});
  }, []);

  const fetchAnimais = useCallback(async () => {
    setLoadingAnimais(true);
    try {
      const params = new URLSearchParams({ status: 'VIVO', limit: '200' });
      Object.entries(filtros).forEach(([k, v]) => { if (v) params.set(k, v); });
      const res = await fetch(`/api/animais?${params}`);
      const data = await res.json();
      setAnimais(data.animais ?? []);
    } catch { toast.error('Erro ao buscar animais'); }
    finally { setLoadingAnimais(false); }
  }, [filtros]);

  useEffect(() => { fetchAnimais(); }, [fetchAnimais]);

  function toggleAnimal(id: number) {
    setSelected((prev) => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  }

  function toggleAll() {
    if (selected.size === animais.length) setSelected(new Set());
    else setSelected(new Set(animais.map((a) => a.id)));
  }

  async function salvarLote() {
    if (!nome || selected.size === 0) return;
    setSaving(true);
    try {
      const dt = dataFechamento ? (parseDateBR(dataFechamento) ?? new Date(dataFechamento)) : null;
      const res = await fetch('/api/lotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome, dataFechamento: dt?.toISOString() ?? null, comprador, valorTotal: valorTotal || null,
          pesoTotal: pesoTotal || null, notaFiscal, gta, observacoes,
          animalIds: Array.from(selected),
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success(`Lote "${nome}" criado com ${selected.size} animal(is).`);
      onSaved();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Erro'); }
    finally { setSaving(false); }
  }

  const inputCls = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500';
  const selectedAnimais = animais.filter((a) => selected.has(a.id));
  const totalPesoSel = selectedAnimais.reduce((s, a) => s + (a.peso ?? 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl mx-4 flex flex-col" style={{ maxHeight: '90vh' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="font-semibold text-slate-900">Novo Lote</h2>
            <div className="flex items-center gap-1">
              {[1, 2].map((s) => (
                <div key={s} className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${step === s ? 'bg-indigo-600 text-white' : step > s ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'}`}>{s}</div>
              ))}
            </div>
            <span className="text-sm text-slate-500">{step === 1 ? 'Selecionar animais' : 'Detalhes do lote'}</span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100"><X size={16} /></button>
        </div>

        {step === 1 ? (
          <>
            {/* Step 1: Filter + Select animals */}
            <div className="px-6 py-4 border-b shrink-0 space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <input value={filtros.numero} onChange={(e) => setFiltros((f) => ({ ...f, numero: e.target.value }))} placeholder="Nº animal" className="border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                <select value={filtros.proprietarioId} onChange={(e) => setFiltros((f) => ({ ...f, proprietarioId: e.target.value }))} className="border border-slate-200 rounded-lg px-3 py-2 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500">
                  <option value="">Proprietário</option>
                  {proprietarios.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <select value={filtros.genero} onChange={(e) => setFiltros((f) => ({ ...f, genero: e.target.value }))} className="border border-slate-200 rounded-lg px-3 py-2 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500">
                  <option value="">Gênero</option>
                  <option value="MACHO">Macho</option>
                  <option value="FEMEA">Fêmea</option>
                </select>
                <select value={filtros.descarte} onChange={(e) => setFiltros((f) => ({ ...f, descarte: e.target.value }))} className="border border-slate-200 rounded-lg px-3 py-2 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500">
                  <option value="">Todos</option>
                  <option value="true">Somente Descarte</option>
                  <option value="false">Sem Descarte</option>
                </select>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>{animais.length} animal(is) encontrado(s)</span>
                <button onClick={toggleAll} className="text-indigo-600 hover:underline">{selected.size === animais.length ? 'Desmarcar todos' : 'Selecionar todos'}</button>
              </div>
            </div>

            <div className="overflow-y-auto flex-1 px-6 py-2">
              {loadingAnimais ? (
                <div className="py-8 text-center text-slate-400 text-sm">Carregando...</div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-white">
                    <tr className="text-left text-xs text-slate-400 border-b border-slate-100">
                      <th className="py-2 pr-3 w-8"><input type="checkbox" checked={selected.size === animais.length && animais.length > 0} onChange={toggleAll} className="w-4 h-4 rounded border-slate-300" /></th>
                      <th className="py-2 pr-3">Nº</th>
                      <th className="py-2 pr-3">Denominação</th>
                      <th className="py-2 pr-3">Proprietário</th>
                      <th className="py-2 pr-3">Peso</th>
                      <th className="py-2">Flags</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {animais.map((a) => (
                      <tr key={a.id} onClick={() => toggleAnimal(a.id)} className={`cursor-pointer transition ${selected.has(a.id) ? 'bg-indigo-50' : 'hover:bg-slate-50'}`}>
                        <td className="py-2 pr-3"><input type="checkbox" checked={selected.has(a.id)} onChange={() => toggleAnimal(a.id)} onClick={(e) => e.stopPropagation()} className="w-4 h-4 rounded border-slate-300 text-indigo-600" /></td>
                        <td className="py-2 pr-3 font-medium text-slate-700">{a.numero ?? '—'}</td>
                        <td className="py-2 pr-3 text-slate-600">{a.denominacao}</td>
                        <td className="py-2 pr-3 text-slate-500 text-xs">{a.proprietario.name}</td>
                        <td className="py-2 pr-3 text-slate-500 text-xs">{a.peso ? `${a.peso} kg` : '—'}</td>
                        <td className="py-2">{a.descarte && <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 text-xs font-medium">Descarte</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="px-6 py-4 border-t shrink-0 flex items-center justify-between">
              <span className="text-sm text-slate-600 font-medium">{selected.size} selecionado(s){totalPesoSel > 0 ? ` · ${fmtKg(totalPesoSel)} estimado` : ''}</span>
              <div className="flex gap-2">
                <button onClick={onClose} className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-sm hover:bg-slate-50 transition">Cancelar</button>
                <button onClick={() => setStep(2)} disabled={selected.size === 0} className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition disabled:opacity-50">
                  Próximo →
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Step 2: Lot details */}
            <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
              <div className="bg-indigo-50 border border-indigo-100 rounded-lg px-4 py-3 text-sm text-indigo-800">
                <span className="font-semibold">{selected.size} animal(is) selecionado(s)</span>
                {totalPesoSel > 0 && <span className="ml-2 text-indigo-600">· Peso total estimado: {fmtKg(totalPesoSel)}</span>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Nome do Lote *</label>
                <input value={nome} onChange={(e) => setNome(e.target.value)} className={inputCls} placeholder="Ex: Lote Garrotes Maio 2026" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Data de Fechamento</label>
                  <DatePickerBR value={dataFechamento || null} onChange={(v) => setDataFechamento(v ?? '')} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Comprador</label>
                  <input value={comprador} onChange={(e) => setComprador(e.target.value)} className={inputCls} placeholder="Nome do comprador" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1"><DollarSign size={11} />Valor Total (R$)</label>
                  <input type="number" step="0.01" value={valorTotal} onChange={(e) => setValorTotal(e.target.value)} className={inputCls} placeholder="Ex: 45000.00" />
                  {valorTotal && selected.size > 0 && (
                    <p className="text-xs text-slate-400 mt-1">≈ {fmtBRL(parseFloat(valorTotal) / selected.size)} por cabeça</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1"><Scale size={11} />Peso Total (kg)</label>
                  <input type="number" step="0.1" value={pesoTotal} onChange={(e) => setPesoTotal(e.target.value)} className={inputCls} placeholder={totalPesoSel > 0 ? `Estimado: ${totalPesoSel.toFixed(1)}` : 'Ex: 1250.0'} />
                  {valorTotal && (pesoTotal || totalPesoSel > 0) && (
                    <p className="text-xs text-slate-400 mt-1">
                      ≈ {fmtBRL(parseFloat(valorTotal) / (parseFloat(pesoTotal) || totalPesoSel))}/kg
                    </p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Nota Fiscal (NF)</label>
                  <input value={notaFiscal} onChange={(e) => setNotaFiscal(e.target.value)} className={inputCls} placeholder="Nº da NF" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">GTA</label>
                  <input value={gta} onChange={(e) => setGta(e.target.value)} className={inputCls} placeholder="Nº do GTA" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Observações</label>
                <textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} rows={2} className={inputCls + ' resize-none'} placeholder="Observações gerais..." />
              </div>
            </div>
            <div className="px-6 py-4 border-t shrink-0 flex gap-3 justify-between">
              <button onClick={() => setStep(1)} className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-sm hover:bg-slate-50 transition">← Voltar</button>
              <div className="flex gap-2">
                <button onClick={onClose} className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-sm hover:bg-slate-50 transition">Cancelar</button>
                <button onClick={salvarLote} disabled={saving || !nome} className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition disabled:opacity-50">
                  {saving ? 'Salvando...' : 'Criar Lote'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
