'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { X, Scale, DollarSign, ChevronDown, ChevronUp, FileSpreadsheet } from 'lucide-react';
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

interface AnimalData {
  pesoAtual: string;
  valorUnit: string;
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
  initialSelectedIds?: number[];
}) {
  const hasPreselection = initialSelectedIds && initialSelectedIds.length > 0;
  const [step, setStep] = useState<1 | 2 | 3>(hasPreselection ? 2 : 1);
  const [animais, setAnimais] = useState<AnimalFiltro[]>([]);
  const [proprietarios, setProprietarios] = useState<Proprietario[]>([]);
  const [loadingAnimais, setLoadingAnimais] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(
    hasPreselection ? new Set(initialSelectedIds) : new Set()
  );
  const [animalData, setAnimalData] = useState<Map<number, AnimalData>>(new Map());
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set());

  const [filtros, setFiltros] = useState({ numero: '', proprietarioId: '', genero: '', denominacao: '', descarte: '' });

  const [nome, setNome] = useState('');
  const [dataFechamento, setDataFechamento] = useState('');
  const [comprador, setComprador] = useState('');
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

  function setAnimalField(id: number, field: 'pesoAtual' | 'valorUnit', value: string) {
    setAnimalData((prev) => {
      const next = new Map(prev);
      const cur = next.get(id) ?? { pesoAtual: '', valorUnit: '' };
      next.set(id, { ...cur, [field]: value });
      return next;
    });
  }

  function toggleCollapse(propId: number) {
    setCollapsed((prev) => { const s = new Set(prev); s.has(propId) ? s.delete(propId) : s.add(propId); return s; });
  }

  const selectedAnimais = animais.filter((a) => selected.has(a.id));
  const byProp = selectedAnimais.reduce<Map<number, { prop: Proprietario; animais: AnimalFiltro[] }>>((m, a) => {
    if (!m.has(a.proprietario.id)) m.set(a.proprietario.id, { prop: a.proprietario, animais: [] });
    m.get(a.proprietario.id)!.animais.push(a);
    return m;
  }, new Map());

  function propTotal(propId: number) {
    const group = byProp.get(propId);
    if (!group) return { peso: 0, valor: 0 };
    return group.animais.reduce((acc, a) => {
      const d = animalData.get(a.id);
      return {
        peso: acc.peso + (parseFloat(d?.pesoAtual || '0') || 0),
        valor: acc.valor + (parseFloat(d?.valorUnit || '0') || 0),
      };
    }, { peso: 0, valor: 0 });
  }

  const grandPeso  = Array.from(byProp.keys()).reduce((s, id) => s + propTotal(id).peso, 0);
  const grandValor = Array.from(byProp.keys()).reduce((s, id) => s + propTotal(id).valor, 0);

  async function salvarLote() {
    if (!nome || selected.size === 0) return;
    setSaving(true);
    try {
      const dt = dataFechamento ? (parseDateBR(dataFechamento) ?? new Date(dataFechamento)) : null;
      const animaisPayload = Array.from(selected).map((id) => {
        const d = animalData.get(id);
        return {
          id,
          pesoAtual: d?.pesoAtual ? parseFloat(d.pesoAtual) : null,
          valorUnit: d?.valorUnit ? parseFloat(d.valorUnit) : null,
        };
      });
      const res = await fetch('/api/lotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome, dataFechamento: dt?.toISOString() ?? null, comprador,
          notaFiscal, gta, observacoes,
          animais: animaisPayload,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success(`Lote "${nome}" criado com ${selected.size} animal(is).`);
      onSaved();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Erro'); }
    finally { setSaving(false); }
  }

  const inputCls = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500';
  const displayCount = hasPreselection ? (initialSelectedIds?.length ?? selected.size) : selected.size;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl mx-4 flex flex-col" style={{ maxHeight: '90vh' }}>
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="font-semibold text-slate-900">Novo Lote</h2>
            {!hasPreselection && (
              <div className="flex items-center gap-1">
                {[1, 2, 3].map((s) => (
                  <div key={s} className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${step === s ? 'bg-indigo-600 text-white' : step > s ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'}`}>{s}</div>
                ))}
              </div>
            )}
            <span className="text-sm text-slate-500">
              {step === 1 ? 'Selecionar animais' : step === 2 ? 'Peso e valor por animal' : 'Detalhes do lote'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="/lotes/importar"
              onClick={onClose}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-500 text-xs font-medium hover:bg-slate-50 transition"
            >
              <FileSpreadsheet size={13} />
              Importar planilha
            </a>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100"><X size={16} /></button>
          </div>
        </div>

        {step === 1 && (
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
              <span className="text-sm text-slate-600 font-medium">{selected.size} selecionado(s)</span>
              <div className="flex gap-2">
                <button onClick={onClose} className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-sm hover:bg-slate-50 transition">Cancelar</button>
                <button onClick={() => setStep(2)} disabled={selected.size === 0} className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition disabled:opacity-50">Próximo →</button>
              </div>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">
              <p className="text-xs text-slate-500">Preencha o peso e o valor de venda de cada animal. Os campos são opcionais.</p>
              {Array.from(byProp.values()).map(({ prop, animais: propAnimais }) => {
                const totais = propTotal(prop.id);
                const isCollapsed = collapsed.has(prop.id);
                return (
                  <div key={prop.id} className="border border-slate-200 rounded-xl overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 bg-slate-50 cursor-pointer" onClick={() => toggleCollapse(prop.id)}>
                      <div>
                        <span className="font-semibold text-slate-800 text-sm">{prop.name}</span>
                        <span className="ml-2 text-xs text-slate-400">{propAnimais.length} animal(is)</span>
                      </div>
                      <div className="flex items-center gap-4">
                        {totais.peso > 0 && <span className="text-xs text-slate-500 flex items-center gap-1"><Scale size={10} />{fmtKg(totais.peso)}</span>}
                        {totais.valor > 0 && <span className="text-xs font-semibold text-emerald-700">{fmtBRL(totais.valor)}</span>}
                        {isCollapsed ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronUp size={14} className="text-slate-400" />}
                      </div>
                    </div>
                    {!isCollapsed && (
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-left text-slate-400 border-b border-slate-100">
                            <th className="px-4 py-2">Nº</th>
                            <th className="px-4 py-2">Denominação</th>
                            <th className="px-4 py-2 w-32">Peso Atual (kg)</th>
                            <th className="px-4 py-2 w-32">Valor (R$)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {propAnimais.map((a) => {
                            const d = animalData.get(a.id) ?? { pesoAtual: '', valorUnit: '' };
                            return (
                              <tr key={a.id} className="hover:bg-slate-50">
                                <td className="px-4 py-2 font-medium text-slate-700">{a.numero ?? '—'}</td>
                                <td className="px-4 py-2 text-slate-600">{a.denominacao}</td>
                                <td className="px-4 py-2">
                                  <input type="number" step="0.1" min="0" value={d.pesoAtual} onChange={(e) => setAnimalField(a.id, 'pesoAtual', e.target.value)} placeholder={a.peso ? String(a.peso) : '—'} className="w-full border border-slate-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400" />
                                </td>
                                <td className="px-4 py-2">
                                  <input type="number" step="0.01" min="0" value={d.valorUnit} onChange={(e) => setAnimalField(a.id, 'valorUnit', e.target.value)} placeholder="0,00" className="w-full border border-slate-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400" />
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                );
              })}
              {(grandPeso > 0 || grandValor > 0) && (
                <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3 flex items-center justify-between">
                  <span className="text-sm font-semibold text-indigo-800">Total do Lote</span>
                  <div className="flex items-center gap-5">
                    {grandPeso > 0 && <span className="text-sm text-indigo-700 flex items-center gap-1"><Scale size={12} />{fmtKg(grandPeso)}</span>}
                    {grandValor > 0 && <span className="text-sm font-bold text-emerald-700">{fmtBRL(grandValor)}</span>}
                  </div>
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t shrink-0 flex justify-between">
              {!hasPreselection ? (
                <button onClick={() => setStep(1)} className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-sm hover:bg-slate-50 transition">← Voltar</button>
              ) : <div />}
              <div className="flex gap-2">
                <button onClick={onClose} className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-sm hover:bg-slate-50 transition">Cancelar</button>
                <button onClick={() => setStep(3)} className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition">Próximo →</button>
              </div>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
              <div className="bg-indigo-50 border border-indigo-100 rounded-lg px-4 py-3 text-sm text-indigo-800 flex items-center justify-between">
                <span><span className="font-semibold">{displayCount} animal(is)</span> · {byProp.size} proprietário(s)</span>
                <div className="flex items-center gap-4">
                  {grandPeso > 0 && <span className="text-xs flex items-center gap-1"><Scale size={10} />{fmtKg(grandPeso)}</span>}
                  {grandValor > 0 && <span className="text-xs font-bold text-emerald-700">{fmtBRL(grandValor)}</span>}
                </div>
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
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Subtotal por proprietário</label>
                  <div className="space-y-1">
                    {Array.from(byProp.values()).map(({ prop }) => {
                      const t = propTotal(prop.id);
                      return (
                        <div key={prop.id} className="flex justify-between text-xs text-slate-600 bg-slate-50 rounded px-2 py-1">
                          <span>{prop.name.split(' ')[0]}</span>
                          <span className="font-semibold text-emerald-700">{t.valor > 0 ? fmtBRL(t.valor) : '—'}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Nota Fiscal / GTA</label>
                  <input value={notaFiscal} onChange={(e) => setNotaFiscal(e.target.value)} className={inputCls + ' mb-2'} placeholder="Nº NF" />
                  <input value={gta} onChange={(e) => setGta(e.target.value)} className={inputCls} placeholder="Nº GTA" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Observações</label>
                <textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} rows={2} className={inputCls + ' resize-none'} placeholder="Observações gerais..." />
              </div>
            </div>
            <div className="px-6 py-4 border-t shrink-0 flex gap-3 justify-between">
              <button onClick={() => setStep(2)} className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-sm hover:bg-slate-50 transition">← Voltar</button>
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
