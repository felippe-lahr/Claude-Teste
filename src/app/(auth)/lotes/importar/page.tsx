'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Upload, FileSpreadsheet, CheckCircle2, AlertTriangle, Scale, DollarSign, Download } from 'lucide-react';
import { DatePickerBR } from '@/components/ui/date-picker-br';
import { parseDateBR } from '@/lib/utils';

interface PreviewItem {
  linha: number;
  id: number | null;
  pesoAtual: number | null;
  valorUnit: number | null;
}

const fmtBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtKg  = (v: number) => `${v.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} kg`;

export default function ImportarLotePage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewItem[] | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [nome, setNome] = useState('');
  const [comprador, setComprador] = useState('');
  const [dataFechamento, setDataFechamento] = useState('');
  const [notaFiscal, setNotaFiscal] = useState('');
  const [gta, setGta] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [atualizarPeso, setAtualizarPeso] = useState(false);

  async function handleFile(f: File) {
    setFile(f);
    setPreview(null);
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('file', f);
      fd.append('preview', 'true');
      const res = await fetch('/api/lotes/importar', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPreview(data.preview);
      setTotal(data.total);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao ler arquivo');
    } finally {
      setLoading(false);
    }
  }

  async function confirmar() {
    if (!file || !nome) return;
    setSaving(true);
    try {
      const dt = dataFechamento ? (parseDateBR(dataFechamento) ?? new Date(dataFechamento)) : null;
      const fd = new FormData();
      fd.append('file', file);
      fd.append('nome', nome);
      fd.append('comprador', comprador);
      if (dt) fd.append('dataFechamento', dt.toISOString());
      fd.append('notaFiscal', notaFiscal);
      fd.append('gta', gta);
      fd.append('observacoes', observacoes);
      fd.append('atualizarPeso', String(atualizarPeso));

      const res = await fetch('/api/lotes/importar', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success(`Lote "${nome}" criado com ${data.total} animais.`);
      router.push('/lotes');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao importar');
    } finally {
      setSaving(false);
    }
  }

  const validIds = preview?.filter((r) => r.id !== null).length ?? 0;
  const totalPeso = preview?.reduce((s, r) => s + (r.pesoAtual ?? 0), 0) ?? 0;
  const totalValor = preview?.reduce((s, r) => s + (r.valorUnit ?? 0), 0) ?? 0;
  const hasPeso = preview?.some((r) => r.pesoAtual !== null) ?? false;

  const inputCls = 'w-full border border-[#E8E8E3] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#111110]/20';

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#111110]">Importar Lote via Planilha</h1>
          <p className="text-sm text-[#6B6B65] mt-1">
            Planilha deve ter colunas: <code className="bg-[#F5F4EF] px-1 rounded">ID</code>,{' '}
            <code className="bg-[#F5F4EF] px-1 rounded">Peso Atual (kg)</code> (opcional),{' '}
            <code className="bg-[#F5F4EF] px-1 rounded">Valor (R$)</code> (opcional)
          </p>
        </div>
        <div className="flex flex-col gap-2 shrink-0">
          <a
            href="/api/lotes/template?animais=true"
            download
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold hover:bg-emerald-100 transition whitespace-nowrap"
          >
            <Download size={13} />
            Lista de animais
          </a>
          <a
            href="/api/lotes/template"
            download
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[#E8E8E3] text-[#6B6B65] text-xs font-semibold hover:bg-[#F5F4EF] transition whitespace-nowrap"
          >
            <Download size={13} />
            Template em branco
          </a>
        </div>
      </div>

      <div
        className="border-2 border-dashed border-[#E8E8E3] rounded-xl p-8 text-center cursor-pointer hover:border-[#111110]/30 transition"
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
      >
        <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
        {file ? (
          <div className="flex items-center justify-center gap-3 text-[#111110]">
            <FileSpreadsheet size={24} className="text-emerald-600" />
            <div className="text-left">
              <p className="font-semibold text-sm">{file.name}</p>
              {!loading && preview && <p className="text-xs text-[#6B6B65]">{total} linha(s) · {validIds} com ID válido</p>}
              {loading && <p className="text-xs text-[#6B6B65]">Lendo arquivo...</p>}
            </div>
          </div>
        ) : (
          <>
            <Upload size={32} className="text-[#A8A8A2] mx-auto mb-2" />
            <p className="text-sm font-medium text-[#111110]">Arraste ou clique para selecionar</p>
            <p className="text-xs text-[#A8A8A2] mt-1">.xlsx, .xls, .csv</p>
          </>
        )}
      </div>

      {preview && (
        <div className="bg-white border border-[#E8E8E3] rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-[#E8E8E3] flex items-center gap-2">
            <CheckCircle2 size={14} className="text-emerald-600" />
            <span className="text-sm font-semibold text-[#111110]">Prévia (primeiras {preview.length} linhas de {total})</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-[#A8A8A2] border-b border-[#F5F4EF]">
                  <th className="px-4 py-2">Linha</th>
                  <th className="px-4 py-2">ID</th>
                  <th className="px-4 py-2">Peso Atual (kg)</th>
                  <th className="px-4 py-2">Valor (R$)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F5F4EF]">
                {preview.map((row) => (
                  <tr key={row.linha}>
                    <td className="px-4 py-2 text-[#A8A8A2]">{row.linha}</td>
                    <td className="px-4 py-2 font-medium text-[#111110]">
                      {row.id ?? <span className="text-red-500 flex items-center gap-1"><AlertTriangle size={10} />sem ID</span>}
                    </td>
                    <td className="px-4 py-2 text-[#6B6B65]">{row.pesoAtual !== null ? `${row.pesoAtual} kg` : '—'}</td>
                    <td className="px-4 py-2 text-[#6B6B65]">{row.valorUnit !== null ? fmtBRL(row.valorUnit) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {(totalPeso > 0 || totalValor > 0) && (
            <div className="px-4 py-3 border-t border-[#E8E8E3] flex gap-6 text-xs text-[#6B6B65]">
              {totalPeso > 0 && <span className="flex items-center gap-1"><Scale size={11} />Total peso: <strong className="text-[#111110]">{fmtKg(totalPeso)}</strong></span>}
              {totalValor > 0 && <span className="flex items-center gap-1"><DollarSign size={11} />Total valor: <strong className="text-[#111110]">{fmtBRL(totalValor)}</strong></span>}
            </div>
          )}
        </div>
      )}

      {preview && (
        <div className="bg-white border border-[#E8E8E3] rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-[#111110]">Detalhes do Lote</h2>

          <div>
            <label className="block text-xs font-semibold text-[#6B6B65] mb-1">Nome do Lote *</label>
            <input value={nome} onChange={(e) => setNome(e.target.value)} className={inputCls} placeholder="Ex: Lote Garrotes Julho 2026" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#6B6B65] mb-1">Data de Fechamento</label>
              <DatePickerBR value={dataFechamento || null} onChange={(v) => setDataFechamento(v ?? '')} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#6B6B65] mb-1">Comprador</label>
              <input value={comprador} onChange={(e) => setComprador(e.target.value)} className={inputCls} placeholder="Nome do comprador" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#6B6B65] mb-1">Nota Fiscal (NF)</label>
              <input value={notaFiscal} onChange={(e) => setNotaFiscal(e.target.value)} className={inputCls} placeholder="Nº da NF" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#6B6B65] mb-1">GTA</label>
              <input value={gta} onChange={(e) => setGta(e.target.value)} className={inputCls} placeholder="Nº do GTA" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#6B6B65] mb-1">Observações</label>
            <textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} rows={2} className={inputCls + ' resize-none'} />
          </div>

          {hasPeso && (
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={atualizarPeso} onChange={(e) => setAtualizarPeso(e.target.checked)} className="w-4 h-4 rounded border-[#E8E8E3] text-[#111110]" />
              <div>
                <span className="text-sm font-medium text-[#111110]">Atualizar peso dos animais</span>
                <p className="text-xs text-[#6B6B65]">Sobrescreve o campo "Peso (kg)" de cada animal com o valor da planilha</p>
              </div>
            </label>
          )}

          <div className="flex gap-3 justify-end pt-2">
            <button onClick={() => router.push('/lotes')} className="px-4 py-2 rounded-lg border border-[#E8E8E3] text-[#6B6B65] text-sm hover:bg-[#F5F4EF] transition">
              Cancelar
            </button>
            <button
              onClick={confirmar}
              disabled={saving || !nome || validIds === 0}
              className="px-4 py-2 rounded-lg bg-[#111110] text-white text-sm font-semibold hover:bg-[#2a2a28] transition disabled:opacity-40"
            >
              {saving ? 'Importando...' : `Criar Lote com ${validIds} animais`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
