'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { ClipboardList, Download, ChevronLeft, ChevronRight, Filter } from 'lucide-react';

const TIPOS = ['CADASTRO','EDICAO','EXCLUSAO','IMPORTACAO','LOTE','REPRODUCAO','SANITARIO'] as const;
type Tipo = typeof TIPOS[number];

const TIPO_LABELS: Record<Tipo, string> = {
  CADASTRO: 'Cadastro',
  EDICAO: 'Edição',
  EXCLUSAO: 'Exclusão',
  IMPORTACAO: 'Importação',
  LOTE: 'Lote',
  REPRODUCAO: 'Reprodução',
  SANITARIO: 'Sanitário',
};

const TIPO_COLORS: Record<Tipo, string> = {
  CADASTRO: 'bg-emerald-100 text-emerald-700',
  EDICAO: 'bg-blue-100 text-blue-700',
  EXCLUSAO: 'bg-red-100 text-red-700',
  IMPORTACAO: 'bg-purple-100 text-purple-700',
  LOTE: 'bg-amber-100 text-amber-700',
  REPRODUCAO: 'bg-pink-100 text-pink-700',
  SANITARIO: 'bg-teal-100 text-teal-700',
};

interface LogEntry {
  id: number;
  tipo: Tipo;
  animalNumero: string | null;
  proprietario: string | null;
  descricao: string;
  userName: string;
  origem: string | null;
  fileName: string | null;
  fileHash: string | null;
  importTotal: number | null;
  importErros: number | null;
  createdAt: string;
}

export default function LogPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const [tipo, setTipo] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '50' });
      if (tipo) params.set('tipo', tipo);
      if (dataInicio) params.set('dataInicio', dataInicio);
      if (dataFim) params.set('dataFim', dataFim);
      const res = await fetch(`/api/log?${params}`);
      const data = await res.json();
      setLogs(data.logs ?? []);
      setTotal(data.total ?? 0);
      setPages(data.pages ?? 1);
    } catch {
      toast.error('Erro ao carregar log');
    } finally {
      setLoading(false);
    }
  }, [page, tipo, dataInicio, dataFim]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  function buildCsvUrl() {
    const params = new URLSearchParams({ formato: 'csv' });
    if (tipo) params.set('tipo', tipo);
    if (dataInicio) params.set('dataInicio', dataInicio);
    if (dataFim) params.set('dataFim', dataFim);
    return `/api/log?${params}`;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <ClipboardList size={24} className="text-indigo-500" />
            Log de Alterações
          </h1>
          <p className="text-slate-500 text-sm mt-1">{total} registros</p>
        </div>
        <a
          href={buildCsvUrl()}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50 transition"
        >
          <Download size={16} />
          Exportar CSV
        </a>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Filter size={14} className="text-slate-400" />
          <span className="text-xs font-medium text-slate-600">Filtros</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <select
            value={tipo}
            onChange={(e) => { setTipo(e.target.value); setPage(1); }}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">Todos os tipos</option>
            {TIPOS.map((t) => <option key={t} value={t}>{TIPO_LABELS[t]}</option>)}
          </select>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-slate-500">De</label>
            <input
              type="date"
              value={dataInicio}
              onChange={(e) => { setDataInicio(e.target.value); setPage(1); }}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-slate-500">Até</label>
            <input
              type="date"
              value={dataFim}
              onChange={(e) => { setDataFim(e.target.value); setPage(1); }}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <button
            onClick={() => { setTipo(''); setDataInicio(''); setDataFim(''); setPage(1); }}
            className="self-end py-2 px-3 rounded-lg border border-slate-300 text-xs text-slate-600 hover:bg-slate-50 transition"
          >
            Limpar filtros
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-slate-400 text-sm">Carregando...</div>
        ) : logs.length === 0 ? (
          <div className="py-16 text-center">
            <ClipboardList size={48} className="text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">Nenhum registro encontrado</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {['Data/Hora','Tipo','Nº Animal','Proprietário','Descrição','Usuário','Origem'].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString('pt-BR')}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${TIPO_COLORS[log.tipo] ?? 'bg-slate-100 text-slate-600'}`}>
                        {TIPO_LABELS[log.tipo] ?? log.tipo}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700 text-xs font-medium">{log.animalNumero ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-600 text-xs">{log.proprietario ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-700 text-xs max-w-xs">
                      <p className="truncate" title={log.descricao}>{log.descricao}</p>
                      {log.tipo === 'IMPORTACAO' && log.fileHash && (
                        <p className="text-slate-400 text-[10px] mt-0.5 font-mono truncate" title={log.fileHash}>
                          SHA: {log.fileHash.slice(0, 16)}…
                        </p>
                      )}
                      {log.tipo === 'IMPORTACAO' && log.importTotal != null && (
                        <p className="text-slate-400 text-[10px] mt-0.5">
                          {log.importTotal} linhas · {log.importErros} erro(s)
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-xs">{log.userName}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{log.origem ?? '—'}</td>
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
    </div>
  );
}
