'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { X, Scale, DollarSign } from 'lucide-react';
import { DatePickerBR } from '@/components/ui/date-picker-br';
import { parseDateBR } from '@/lib/utils';

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

const fmtBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtKg  = (v: number) => `${v.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} kg`;

export function NovoLoteWizard({
  onClose,
  onSaved,
  initialSelectedIds,
}: {
  onClose: () => void;
  onSaved: () => void;
  /** When provided, skip step 1 and use these animal IDs directly */
  initialSelectedIds?: number[];
}) {
  const hasPreselection = initialSelectedIds && initialSelectedIds.length > 0;
  const [step, setStep] = useState<1 | 2>(hasPreselection ? 2 : 1);
  const [animais, setAnimais] = useState<AnimalFiltro[]>([]);
  const [proprietarios, setProprietarios] = useState<Proprietario[]>([]);
  const [loadingAnimais, setLoadingAnimais] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(
    hasPreselection ? new Set(initialSelectedIds) : new Set()
  );

  const [filtros, setFiltros] = useState({ numero: '', proprietarioId: '', genero: '', denominacao: '', descarte: '' });

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

  // Always load animals (needed for weight totals and the table in step 1)
  const fetchAnimais = useCallback(async () => {
    setLoadingAnimais(true);
    try {
      const params = new URLSearchParams({ status: 'VIVO', limit: '200' });
      if (!hasPreselection) Object.entries(filtros).forEach(([k, v]) => { if (v) params.set(k, v); });
      const res = await fetch(`/api/animais?${params}`);
      const data = await res.json();
      setAnimais(data.animais ?? []);
    } catch { toast.error('Erro ao buscar animais'); }
    finally { setLoadingAnimais(false); }
  }, [filtros, hasPreselection]);

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
  // If we have preselection but animals haven't loaded yet, estimate from count
  const displayCount = hasPreselection ? (initialSelectedIds?.length ?? selected.size) : selected.size;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl mx-4 flex flex-col" style={{ maxHeight: '90vh' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="font-semibold text-slate-900">Novo Lote</h2>
            {!hasPreselection && (
              <div className="flex items-center gap-1">
                {[1, 2].map((s) => (
                  <div key={s} className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${step === s ? 'bg-indigo-600 text-white' : step > s ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'}`}>{s}</div>
                ))}
              </div>
            )}
            <span className="text-sm text-slate-500">{step === 1 ? 'Selecionar animais' : 'Detalhes do lote'}</span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100"><X size={16} /></button>
        </div>

        {step === 1 ? (
          <>
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
            <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
              <div className="bg-indigo-50 border border-indigo-100 rounded-lg px-4 py-3 text-sm text-indigo-800">
                <span className="font-semibold">{displayCount} animal(is) selecionado(s)</span>
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
                  {valorTotal && displayCount > 0 && (
                    <p className="text-xs text-slate-400 mt-1">≈ {fmtBRL(parseFloat(valorTotal) / displayCount)} por cabeça</p>
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
              {!hasPreselection ? (
                <button onClick={() => setStep(1)} className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-sm hover:bg-slate-50 transition">← Voltar</button>
              ) : <div />}
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
