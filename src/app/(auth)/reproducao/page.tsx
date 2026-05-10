'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { HeartPulse, ChevronLeft, ChevronRight } from 'lucide-react';
import { TableSkeleton } from '@/components/ui/skeleton';

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
  dataToque: string | null;
  inseminada: boolean;
  dataInseminacao: string | null;
  estacaoMonta: { id: number; nome: string } | null;
  semen: { codigo: string; touro: string | null } | null;
  animal: {
    id: number;
    numero: string | null;
    denominacao: string;
    proprietario: { id: number; name: string };
  };
}

interface Resumo {
  totalFemeas: number;
  cheias: number;
  vazias: number;
  paridas: number;
}

const STATUS_LABEL: Record<string, string> = {
  CHEIA: 'Cheia',
  VAZIA: 'Vazia',
  PARIDA: 'Parida',
  BEZERRO_NO_PE: 'Bezerro no Pé',
};

const STATUS_COLOR: Record<string, string> = {
  CHEIA: 'bg-green-100 text-green-800',
  VAZIA: 'bg-red-100 text-red-800',
  PARIDA: 'bg-blue-100 text-blue-800',
  BEZERRO_NO_PE: 'bg-purple-100 text-purple-800',
};

function formatDate(iso: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR');
}

export default function ReproducaoPage() {
  const [reproducoes, setReproducoes] = useState<ReproducaoItem[]>([]);
  const [resumo, setResumo] = useState<Resumo>({ totalFemeas: 0, cheias: 0, vazias: 0, paridas: 0 });
  const [estacoes, setEstacoes] = useState<EstacaoMonta[]>([]);
  const [proprietarios, setProprietarios] = useState<Proprietario[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState({
    estacaoMontaId: '',
    statusReprodutivo: '',
    proprietarioId: '',
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
      const params = new URLSearchParams({ page: String(page) });
      Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
      const res = await fetch(`/api/reproducao?${params}`);
      const data = await res.json();
      setReproducoes(data.reproducoes ?? []);
      setTotal(data.total ?? 0);
      setPages(data.pages ?? 1);
      if (data.resumo) setResumo(data.resumo);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => { fetchData(); }, [fetchData]);

  function handleFilter(key: string, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  }

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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Fêmeas', value: resumo.totalFemeas, color: 'bg-slate-50 border-slate-200 text-slate-700' },
          { label: 'Cheias', value: resumo.cheias, color: 'bg-green-50 border-green-200 text-green-700' },
          { label: 'Vazias', value: resumo.vazias, color: 'bg-red-50 border-red-200 text-red-700' },
          { label: 'Paridas / Bezerro', value: resumo.paridas, color: 'bg-blue-50 border-blue-200 text-blue-700' },
        ].map((card) => (
          <div key={card.label} className={`rounded-xl border p-4 ${card.color}`}>
            <p className="text-xs font-semibold uppercase tracking-wide opacity-70">{card.label}</p>
            <p className="text-3xl font-bold mt-1">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
            <option value="CHEIA">Cheia</option>
            <option value="VAZIA">Vazia</option>
            <option value="PARIDA">Parida</option>
            <option value="BEZERRO_NO_PE">Bezerro no Pé</option>
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
                  {['Animal', 'Proprietário', 'Status', 'Data Toque', 'Estação de Monta', 'Inseminada', 'Sêmen', 'Data Inseminação'].map((h) => (
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
                      {r.statusReprodutivo ? (
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLOR[r.statusReprodutivo] ?? 'bg-slate-100 text-slate-700'}`}>
                          {STATUS_LABEL[r.statusReprodutivo] ?? r.statusReprodutivo}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-xs">{formatDate(r.dataToque)}</td>
                    <td className="px-4 py-3 text-slate-600 text-xs">{r.estacaoMonta?.nome ?? '—'}</td>
                    <td className="px-4 py-3 text-xs">
                      <span className={r.inseminada ? 'text-green-700 font-semibold' : 'text-slate-400'}>
                        {r.inseminada ? 'Sim' : 'Não'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-xs">
                      {r.semen ? `${r.semen.codigo}${r.semen.touro ? ` (${r.semen.touro})` : ''}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-xs">{formatDate(r.dataInseminacao)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

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
    </div>
  );
}
