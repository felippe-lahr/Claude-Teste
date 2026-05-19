'use client';

import { useState, useRef } from 'react';
import { toast } from 'sonner';
import { Upload, Download, CheckCircle, AlertCircle, FileSpreadsheet, ArrowRight } from 'lucide-react';

interface PreviewRow {
  numero: string;
  genero: string;
  eraMes: unknown;
  eraAno: unknown;
  peso: unknown;
  reprodutor: boolean;
  proprietario: string;
  observacoes: string;
}

interface ImportResult {
  importados: number;
  atualizados: number;
  erros: string[];
  total: number;
}

const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

function formatMes(m: unknown) {
  if (!m) return '—';
  const n = parseInt(String(m));
  return MESES[n - 1] ?? String(m);
}

export default function ImportarPage() {
  const [step, setStep] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [forceMode, setForceMode] = useState(false);
  const [duplicateMsg, setDuplicateMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setLoading(true);

    try {
      const fd = new FormData();
      fd.append('file', f);
      const res = await fetch('/api/importar', { method: 'POST', body: fd });
      if (!res.ok) throw new Error('Erro ao processar arquivo');
      const data = await res.json();
      setPreview(data.preview ?? []);
      setTotalRows(data.total ?? 0);
      setStep(3);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao processar arquivo');
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirmar(force = false) {
    if (!file) return;
    setLoading(true);
    setDuplicateMsg(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const url = force ? '/api/importar/confirmar?force=1' : '/api/importar/confirmar';
      const res = await fetch(url, { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409 && data.podeForcar) {
          setDuplicateMsg(data.error);
          return;
        }
        throw new Error(data.error ?? 'Erro na importação');
      }
      setResult(data);
      setStep(4);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro na importação');
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setStep(1);
    setFile(null);
    setPreview([]);
    setTotalRows(0);
    setResult(null);
    setForceMode(false);
    setDuplicateMsg(null);
    if (fileRef.current) fileRef.current.value = '';
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Upload size={24} className="text-indigo-500" />
          Importar Planilha
        </h1>
        <p className="text-slate-500 text-sm mt-1">Importe animais em lote via arquivo Excel</p>
      </div>

      {/* Steps */}
      <div className="flex items-center gap-2">
        {[
          { n: 1, label: 'Modelo' },
          { n: 2, label: 'Upload' },
          { n: 3, label: 'Preview' },
          { n: 4, label: 'Resultado' },
        ].map((s, i) => (
          <div key={s.n} className="flex items-center gap-2">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${step >= s.n ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${step > s.n ? 'bg-white text-indigo-500' : 'bg-white/30'}`}>
                {step > s.n ? '✓' : s.n}
              </span>
              {s.label}
            </div>
            {i < 3 && <ArrowRight size={14} className="text-slate-300" />}
          </div>
        ))}
      </div>

      {/* Step 1: Download modelo */}
      {step === 1 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 text-center">
          <FileSpreadsheet size={48} className="text-indigo-300 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-slate-800 mb-2">1. Baixe o Modelo</h2>
          <p className="text-slate-500 text-sm mb-6 max-w-md mx-auto">
            Faça o download do modelo de planilha, preencha com os dados dos animais e faça o upload no próximo passo.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href="/api/importar/modelo"
              className="flex items-center gap-2 px-6 py-3 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-sm transition"
            >
              <Download size={16} />
              Baixar Modelo Excel
            </a>
            <button
              onClick={() => setStep(2)}
              className="flex items-center gap-2 px-6 py-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition"
            >
              Já tenho o arquivo
              <ArrowRight size={16} />
            </button>
          </div>
          <div className="mt-8 text-left bg-slate-50 rounded-lg p-4 max-w-md mx-auto">
            <p className="text-xs font-semibold text-slate-700 mb-2">Colunas esperadas:</p>
            <div className="grid grid-cols-2 gap-1">
              {['Número','Gênero','Mês Nasc','Ano Nasc','Peso','Reprodutor','Proprietário','Observações'].map((c) => (
                <span key={c} className="text-xs text-slate-500 flex items-center gap-1">
                  <span className="text-emerald-500">•</span> {c}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Upload */}
      {step === 2 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 text-center">
          <h2 className="text-lg font-semibold text-slate-800 mb-2">2. Faça o Upload</h2>
          <p className="text-slate-500 text-sm mb-6">Selecione o arquivo Excel (.xlsx) preenchido</p>

          <label className="cursor-pointer inline-block">
            <div className="border-2 border-dashed border-slate-300 hover:border-indigo-400 rounded-xl p-12 transition-colors">
              <Upload size={40} className="text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 text-sm font-medium">Clique para selecionar o arquivo</p>
              <p className="text-slate-400 text-xs mt-1">Somente .xlsx</p>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx"
              className="hidden"
              onChange={handleUpload}
            />
          </label>

          {loading && <p className="mt-4 text-sm text-indigo-500 font-medium">Processando arquivo...</p>}

          <div className="mt-4">
            <button onClick={() => setStep(1)} className="text-sm text-slate-400 hover:text-slate-600 transition">
              ← Voltar
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Preview */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-semibold text-slate-800">3. Preview dos Dados</h2>
                <p className="text-sm text-slate-500 mt-0.5">
                  Exibindo as primeiras {preview.length} de {totalRows} linhas do arquivo
                </p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    {['Número','Gênero','Mês Nasc','Ano Nasc','Peso','Reprodutor','Proprietário','Observações'].map((h) => (
                      <th key={h} className="text-left px-3 py-2 font-semibold text-slate-500 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {preview.map((row, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="px-3 py-2 text-slate-700">{row.numero || '—'}</td>
                      <td className="px-3 py-2 text-slate-600">{row.genero}</td>
                      <td className="px-3 py-2 text-slate-600">{formatMes(row.eraMes)}</td>
                      <td className="px-3 py-2 text-slate-600">{String(row.eraAno ?? '—')}</td>
                      <td className="px-3 py-2 text-slate-600">{String(row.peso ?? '—')}</td>
                      <td className="px-3 py-2 text-slate-600">{row.reprodutor ? 'Sim' : 'Não'}</td>
                      <td className="px-3 py-2 text-slate-700 font-medium">{row.proprietario}</td>
                      <td className="px-3 py-2 text-slate-500 max-w-xs truncate">{row.observacoes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {duplicateMsg && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-sm text-amber-800 font-medium mb-1">Arquivo já importado</p>
              <p className="text-xs text-amber-700 mb-3">{duplicateMsg}</p>
              <p className="text-xs text-amber-700 mb-3">
                Deseja forçar a reimportação? Os dados reprodutivos e vacinas serão recriados com os valores atuais da planilha.
              </p>
              <button
                onClick={() => { setForceMode(true); handleConfirmar(true); }}
                disabled={loading}
                className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold transition disabled:opacity-60"
              >
                {loading ? 'Reimportando...' : 'Sim, forçar reimportação'}
              </button>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => { setStep(2); if (fileRef.current) fileRef.current.value = ''; setDuplicateMsg(null); }}
              className="px-4 py-2.5 rounded-lg border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50 transition"
            >
              ← Trocar arquivo
            </button>
            <button
              onClick={() => handleConfirmar(forceMode)}
              disabled={loading}
              className="flex-1 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition disabled:opacity-60"
            >
              {loading ? 'Importando...' : `Confirmar Importação de ${totalRows} Animais`}
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Resultado */}
      {step === 4 && result && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8">
          <h2 className="text-lg font-semibold text-slate-800 mb-6">4. Resultado da Importação</h2>

          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-blue-700">{result.total}</p>
              <p className="text-xs text-blue-600 mt-1">Total processado</p>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 text-center">
              <CheckCircle size={24} className="text-emerald-500 mx-auto mb-1" />
              <p className="text-2xl font-bold text-emerald-700">{result.importados}</p>
              <p className="text-xs text-emerald-600 mt-1">Criados</p>
            </div>
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 text-center">
              <CheckCircle size={24} className="text-indigo-500 mx-auto mb-1" />
              <p className="text-2xl font-bold text-indigo-700">{result.atualizados ?? 0}</p>
              <p className="text-xs text-indigo-600 mt-1">Atualizados</p>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
              <AlertCircle size={24} className="text-red-400 mx-auto mb-1" />
              <p className="text-2xl font-bold text-red-700">{result.erros.length}</p>
              <p className="text-xs text-red-600 mt-1">Com erros</p>
            </div>
          </div>

          {result.erros.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-xs font-semibold text-red-700 mb-2">Erros encontrados:</p>
              <ul className="space-y-1">
                {result.erros.map((e, i) => (
                  <li key={i} className="text-xs text-red-600 flex items-start gap-1.5">
                    <span className="text-red-400 mt-0.5">•</span>
                    {e}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleReset}
              className="px-4 py-2.5 rounded-lg border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50 transition"
            >
              Nova Importação
            </button>
            <a
              href="/animais"
              className="px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition"
            >
              Ver Animais →
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
