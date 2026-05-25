'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { HeartPulse, ChevronLeft, ChevronRight, Baby } from 'lucide-react';
import { TableSkeleton } from '@/components/ui/skeleton';
import { calcularEstagioAtual, DEFAULT_PRENHEZ_CONFIGS } from '@/lib/prenhez';

const MESES_PT = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];

function fmtMesAno(dateStr: string | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return `${MESES_PT[d.getUTCMonth()]}/${d.getUTCFullYear()}`;
}

interface EstacaoMonta {
  id: number;
  nome: string;
}

interface Proprietario {
  id: number;
  name: string;
}

interface ReproducaoItem {
  id: number;
  statusReprodutivo: string | null;
  estagioPrenhez: string | null;
  dataToque: string | null;
  inseminada: boolean;
  dataInseminacao: string | null;
  montaNatural: boolean;
  dataMontaNatural: string | null;
  ultimoPartoMes: number | null;
  ultimoPartoAno: number | null;
  nuncaPariu: boolean;
  estacaoMonta: { id: number; nome: string } | null;
  semen: { codigo: string; touro: string | null } | null;
  animal: {
    id: number;
    numero: string | null;
    denominacao: string;
    proprietario: { id: number; name: string };
  };
}

interface ProjecaoItem {
  mes: number;
  ano: number;
  count: number;
}

const MESES_NOMES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

const PRENHEZ_BADGE: Record<string, string> = {
  P1: 'bg-yellow-100 text-yellow-800',
  P2: 'bg-orange-100 text-orange-800',
  P3: 'bg-green-100 text-green-800',
};

interface Prenhez {
  percent: number;
  cheias: number;
  total: number;
}

interface Resumo {
  totalFemeas: number;
  cheias: number;
  vazias: number;
  nuncaPariu: number;
  prenhez: Prenhez | null;
}

const STATUS_LABEL: Record<string, string> = {
  CHEIA: 'Cheia (Prenha)',
  VAZIA: 'Vazia',
};

const STATUS_COLOR: Record<string, string> = {
  CHEIA: 'bg-green-100 text-green-800',
  VAZIA: 'bg-red-100 text-red-800',
};

export default function ReproducaoPage() {
  const [reproducoes, setReproducoes] = useState<ReproducaoItem[]>([]);
  const [resumo, setResumo] = useState<Resumo>({ totalFemeas: 0, cheias: 0, vazias: 0, nuncaPariu: 0, prenhez: null });
  const [projecao, setProjecao] = useState<ProjecaoItem[]>([]);
  const [estacoes, setEstacoes] = useState<EstacaoMonta[]>([]);
  const [proprietarios, setProprietarios] = useState<Proprietario[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [limit, setLimit] = useState(20);
  const [loading, setLoading] = useState(true);
  const [excluirDescartes, setExcluirDescartes] = useState(false);

  const [filters, setFilters] = useState({
    estacaoMontaId: '',
    statusReprodutivo: '',
    proprietarioId: '',
    toqueMes: '',
    toqueAno: '',
  });

  useEffect(() => {
    fetch('/api/estacoes-monta')
      .then((r) => r.json())
      .then((d) => setEstacoes(Array.isArray(d) ? d : []))
      .catch(() => {});
    fetch('/api/animais?limit=1000&genero=FEMEA')
      .then((r) => r.json())
      .then((d) => {
        const unique: Record<number, Proprietario> = {};
        (d.animais ?? []).forEach((a: { proprietario: Proprietario }) => {
          unique[a.proprietario.id] = a.proprietario;
        });
        setProprietarios(Object.values(unique));
      })
      .catch(() => {});
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
      if (filters.toqueMes && filters.toqueAno) {
        params.set('excluirDescartes', String(excluirDescartes));
      }
      const res = await fetch(`/api/reproducao?${params}`);
      const data = await res.json();
      setReproducoes(data.reproducoes ?? []);
      setTotal(data.total ?? 0);
      setPages(data.pages ?? 1);
      if (data.resumo) setResumo(data.resumo);
      if (data.projecao) setProjecao(data.projecao);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [page, limit, filters, excluirDescartes]);

  useEffect(() => { fetchData(); }, [fetchData]);

  function handleFilter(key: string, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  }

  function handleLimitChange(newLimit: number) {
    setLimit(newLimit);
    setPage(1);
  }

  const toqueFilterActive = !!(filters.toqueMes && filters.toqueAno);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <HeartPulse size={24} className="text-pink-500" />
            Reprodução
          </h1>
          <p className="text-slate-500 text-sm mt-1">{total} registros encontrados</p>
        </div>
      </div>

      {/* Cards resumo */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="rounded-xl border p-4 bg-slate-50 border-slate-200 text-slate-700">
          <p className="text-xs font-semibold uppercase tracking-wide opacity-70">Total Fêmeas</p>
          <p className="text-3xl font-bold mt-1">{resumo.totalFemeas}</p>
        </div>
        <div className="rounded-xl border p-4 bg-green-50 border-green-200 text-green-700">
          <p className="text-xs font-semibold uppercase tracking-wide opacity-70">Cheias</p>
          <p className="text-3xl font-bold mt-1">{resumo.cheias}</p>
        </div>
        <div className="rounded-xl border p-4 bg-red-50 border-red-200 text-red-700">
          <p className="text-xs font-semibold uppercase tracking-wide opacity-70">Vazias</p>
          <p className="text-3xl font-bold mt-1">{resumo.vazias}</p>
        </div>
        <div className="rounded-xl border p-4 bg-amber-50 border-amber-200 text-amber-700">
          <p className="text-xs font-semibold uppercase tracking-wide opacity-70">Primíparas</p>
          <p className="text-3xl font-bold mt-1">{resumo.nuncaPariu}</p>
        </div>

        {/* Índice de Prenhez */}
        <div className="rounded-xl border p-4 bg-pink-50 border-pink-200 text-pink-700">
          <div className="flex items-start justify-between gap-2 mb-1">
            <p className="text-xs font-semibold uppercase tracking-wide opacity-70">Índice de Prenhez</p>
            <label className="flex items-center gap-1 text-[10px] font-medium cursor-pointer whitespace-nowrap opacity-80 hover:opacity-100">
              <input
                type="checkbox"
                checked={excluirDescartes}
                onChange={(e) => setExcluirDescartes(e.target.checked)}
                className="accent-pink-600"
              />
              Excluir descartes
            </label>
          </div>
          {toqueFilterActive && resumo.prenhez !== null ? (
            <>
              <p className="text-3xl font-bold">{resumo.prenhez.percent}%</p>
              <p className="text-xs mt-0.5 opacity-70">{resumo.prenhez.cheias} cheias de {resumo.prenhez.total} tocadas</p>
            </>
          ) : (
            <p className="text-sm mt-2 opacity-50 italic">Selecione mês e ano do toque</p>
          )}
        </div>
      </div>

      {/* Card Projeção de Nascimentos */}
      {projecao.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-2 mb-4">
            <Baby size={16} className="text-pink-500" />
            Projeção de Nascimentos (próximos 6 meses)
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {projecao.map((p) => (
              <div key={`${p.ano}-${p.mes}`} className="rounded-lg border border-pink-100 bg-pink-50 p-3 text-center">
                <p className="text-xs font-semibold text-pink-600 mb-1">{MESES_NOMES[p.mes - 1].substring(0, 3)}/{p.ano}</p>
                <p className="text-2xl font-bold text-pink-800">{p.count}</p>
                <p className="text-xs text-pink-500 mt-0.5">{p.count === 1 ? 'parto' : 'partos'}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <select
            value={filters.toqueMes}
            onChange={(e) => handleFilter('toqueMes', e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-2 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
          >
            <option value="">Toque — todos os meses</option>
            {MESES_PT.map((m, i) => (
              <option key={m} value={i + 1}>{m}</option>
            ))}
          </select>

          <select
            value={filters.toqueAno}
            onChange={(e) => handleFilter('toqueAno', e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-2 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
          >
            <option value="">Toque — todos os anos</option>
            {[2020,2021,2022,2023,2024,2025,2026].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>

          <select
            value={filters.estacaoMontaId}
            onChange={(e) => handleFilter('estacaoMontaId', e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-2 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
          >
            <option value="">Todas as Estações</option>
            {estacoes.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
          </select>

          <select
            value={filters.statusReprodutivo}
            onChange={(e) => handleFilter('statusReprodutivo', e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-2 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
          >
            <option value="">Todos os Status</option>
            <option value="CHEIA">Cheia (Prenha)</option>
            <option value="VAZIA">Vazia</option>
          </select>

          <select
            value={filters.proprietarioId}
            onChange={(e) => handleFilter('proprietarioId', e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-2 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
          >
            <option value="">Todos os Proprietários</option>
            {proprietarios.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-6"><TableSkeleton rows={8} cols={8} /></div>
        ) : reproducoes.length === 0 ? (
          <div className="py-16 text-center">
            <HeartPulse size={48} className="text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">Nenhum registro reprodutivo encontrado</p>
            <p className="text-slate-400 text-sm mt-1">Edite uma fêmea para registrar o status reprodutivo</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {['Animal', 'Proprietário', 'Status', 'Último Parto', 'Data Toque', 'Estação de Monta', 'Cobertura', 'Sêmen / Data Monta'].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reproducoes.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/animais/${r.animal.id}`} className="font-medium text-slate-900 hover:text-brand-600">
                        {r.animal.numero ? `Nº ${r.animal.numero}` : `#${r.animal.id}`}
                        <span className="text-slate-400 font-normal ml-1">— {r.animal.denominacao}</span>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-xs">{r.animal.proprietario.name}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {r.statusReprodutivo ? (
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLOR[r.statusReprodutivo] ?? 'bg-slate-100 text-slate-700'}`}>
                            {STATUS_LABEL[r.statusReprodutivo] ?? r.statusReprodutivo}
                          </span>
                        ) : '—'}
                        {r.statusReprodutivo === 'CHEIA' && r.estagioPrenhez && (() => {
                          const estagio = r.dataToque
                            ? calcularEstagioAtual(r.estagioPrenhez, new Date(r.dataToque), DEFAULT_PRENHEZ_CONFIGS)
                            : (r.estagioPrenhez as 'P1' | 'P2' | 'P3');
                          return (
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${PRENHEZ_BADGE[estagio] ?? ''}`}>
                              {estagio}
                            </span>
                          );
                        })()}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {r.statusReprodutivo === 'VAZIA'
                        ? r.nuncaPariu
                          ? <span className="text-amber-600 font-medium">Primípara</span>
                          : (r.ultimoPartoMes && r.ultimoPartoAno ? `${String(r.ultimoPartoMes).padStart(2,'0')}/${r.ultimoPartoAno}` : '—')
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-xs">{fmtMesAno(r.dataToque)}</td>
                    <td className="px-4 py-3 text-slate-600 text-xs">{r.estacaoMonta?.nome ?? '—'}</td>
                    <td className="px-4 py-3 text-xs">
                      {r.inseminada
                        ? <span className="text-blue-700 font-semibold">IA</span>
                        : r.montaNatural
                          ? <span className="text-green-700 font-semibold">Monta Natural</span>
                          : <span className="text-slate-400">—</span>
                      }
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-xs">
                      {r.inseminada
                        ? (r.semen ? `${r.semen.codigo}${r.semen.touro ? ` (${r.semen.touro})` : ''}` : (r.dataInseminacao ? fmtMesAno(r.dataInseminacao) : '—'))
                        : r.montaNatural
                          ? (r.dataMontaNatural ? fmtMesAno(r.dataMontaNatural) : '—')
                          : '—'
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-slate-50">
          <div className="flex items-center gap-3">
            <p className="text-xs text-slate-500">Página {page} de {pages} · {total} resultados</p>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-400">Exibir:</span>
              {[20, 50, 100, 200].map((n) => (
                <button
                  key={n}
                  onClick={() => handleLimitChange(n)}
                  className={`px-2 py-0.5 rounded text-xs font-medium border transition ${limit === n ? 'bg-brand-600 text-white border-brand-600' : 'border-slate-300 text-slate-600 hover:bg-white'}`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
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
      </div>
    </div>
  );
}
