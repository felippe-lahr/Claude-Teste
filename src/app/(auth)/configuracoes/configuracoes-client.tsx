'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Settings, TrendingUp, List, Users, Key, Skull, Trash2, Calendar, FlaskConical } from 'lucide-react';
import { Drawer } from '@/components/ui/drawer';

interface ClassificacaoConfig {
  id: number;
  denominacao: string;
  genero: 'MACHO' | 'FEMEA';
  idadeMinMeses: number;
  idadeMaxMeses: number | null;
  ordem: number;
}

interface Usuario {
  id: number;
  name: string;
  email: string;
  role: string;
}

interface CausaMorte {
  id: number;
  nome: string;
}

interface EstacaoMonta {
  id: number;
  nome: string;
  dataInicio: string | Date;
  dataFim: string | Date;
}

interface SemenItem {
  id: number;
  codigo: string;
  touro: string | null;
}

interface Props {
  ticker: Record<string, string>;
  classificacoes: ClassificacaoConfig[];
  usuarios: Usuario[];
  causasMorte: CausaMorte[];
  estacoes: EstacaoMonta[];
  semens: SemenItem[];
}

const senhaSchema = z.object({
  novaSenha: z.string().min(6, 'Mínimo de 6 caracteres'),
  confirmarSenha: z.string(),
}).refine((d) => d.novaSenha === d.confirmarSenha, {
  message: 'Senhas não conferem',
  path: ['confirmarSenha'],
});

type SenhaData = z.infer<typeof senhaSchema>;

export function ConfiguracoesClient({ ticker: initialTicker, classificacoes: initialClassificacoes, usuarios, causasMorte: initialCausas, estacoes: initialEstacoes, semens: initialSemens }: Props) {
  const [ticker, setTicker] = useState(initialTicker);
  const [classificacoes, setClassificacoes] = useState(initialClassificacoes);
  const [causasMorte, setCausasMorte] = useState(initialCausas);
  const [novaCausa, setNovaCausa] = useState('');
  const [savingCausa, setSavingCausa] = useState(false);
  const [savingTicker, setSavingTicker] = useState(false);
  const [savingClassif, setSavingClassif] = useState(false);

  const [estacoes, setEstacoes] = useState(initialEstacoes);
  const [novaEstacaoNome, setNovaEstacaoNome] = useState('');
  const [novaEstacaoInicio, setNovaEstacaoInicio] = useState('');
  const [novaEstacaoFim, setNovaEstacaoFim] = useState('');
  const [savingEstacao, setSavingEstacao] = useState(false);

  const [semens, setSemens] = useState(initialSemens);
  const [novoSemenCodigo, setNovoSemenCodigo] = useState('');
  const [novoSemenTouro, setNovoSemenTouro] = useState('');
  const [savingSemen, setSavingSemen] = useState(false);
  const [senhaDrawer, setSenhaDrawer] = useState(false);
  const [senhaUserId, setSenhaUserId] = useState<number | null>(null);
  const [senhaUserName, setSenhaUserName] = useState('');
  const [savingSenha, setSavingSenha] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<SenhaData>({
    resolver: zodResolver(senhaSchema),
  });

  function handleTickerChange(key: string, value: string) {
    setTicker((prev) => ({ ...prev, [key]: value }));
  }

  async function salvarTicker() {
    setSavingTicker(true);
    try {
      const res = await fetch('/api/configuracoes/ticker', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ticker),
      });
      if (!res.ok) throw new Error('Erro ao salvar');
      toast.success('Preços atualizados com sucesso!');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao salvar');
    } finally {
      setSavingTicker(false);
    }
  }

  function handleClassifChange(id: number, field: 'idadeMinMeses' | 'idadeMaxMeses', value: string) {
    setClassificacoes((prev) =>
      prev.map((c) => c.id === id ? { ...c, [field]: value === '' ? null : parseInt(value) } : c)
    );
  }

  async function salvarClassificacoes() {
    setSavingClassif(true);
    try {
      const res = await fetch('/api/configuracoes/classificacao', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(classificacoes),
      });
      if (!res.ok) throw new Error('Erro ao salvar');
      const data = await res.json();
      toast.success(`Classificações salvas! ${data.recalculados} animais recalculados.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao salvar');
    } finally {
      setSavingClassif(false);
    }
  }

  function abrirSenha(usuario: Usuario) {
    setSenhaUserId(usuario.id);
    setSenhaUserName(usuario.name);
    reset();
    setSenhaDrawer(true);
  }

  async function salvarSenha(data: SenhaData) {
    if (!senhaUserId) return;
    setSavingSenha(true);
    try {
      const res = await fetch(`/api/configuracoes/usuarios/${senhaUserId}/senha`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ novaSenha: data.novaSenha }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success(`Senha de ${senhaUserName} atualizada!`);
      setSenhaDrawer(false);
      reset();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao alterar senha');
    } finally {
      setSavingSenha(false);
    }
  }

  async function adicionarCausa() {
    if (!novaCausa.trim()) return;
    setSavingCausa(true);
    try {
      const res = await fetch('/api/causas-morte', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: novaCausa.trim() }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const nova = await res.json();
      setCausasMorte((prev) => [...prev, nova]);
      setNovaCausa('');
      toast.success('Causa adicionada!');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao adicionar');
    } finally {
      setSavingCausa(false);
    }
  }

  async function removerCausa(id: number) {
    try {
      const res = await fetch(`/api/causas-morte/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Erro ao remover');
      setCausasMorte((prev) => prev.filter((c) => c.id !== id));
      toast.success('Causa removida!');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao remover');
    }
  }

  async function adicionarEstacao() {
    if (!novaEstacaoNome.trim() || !novaEstacaoInicio || !novaEstacaoFim) return;
    setSavingEstacao(true);
    try {
      const res = await fetch('/api/estacoes-monta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: novaEstacaoNome.trim(), dataInicio: novaEstacaoInicio, dataFim: novaEstacaoFim }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const nova = await res.json();
      setEstacoes((prev) => [nova, ...prev]);
      setNovaEstacaoNome('');
      setNovaEstacaoInicio('');
      setNovaEstacaoFim('');
      toast.success('Estação de monta adicionada!');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao adicionar');
    } finally {
      setSavingEstacao(false);
    }
  }

  async function removerEstacao(id: number) {
    try {
      const res = await fetch(`/api/estacoes-monta/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Erro ao remover');
      setEstacoes((prev) => prev.filter((e) => e.id !== id));
      toast.success('Estação removida!');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao remover');
    }
  }

  async function adicionarSemen() {
    if (!novoSemenCodigo.trim()) return;
    setSavingSemen(true);
    try {
      const res = await fetch('/api/semen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codigo: novoSemenCodigo.trim(), touro: novoSemenTouro.trim() || null }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const novo = await res.json();
      setSemens((prev) => [...prev, novo]);
      setNovoSemenCodigo('');
      setNovoSemenTouro('');
      toast.success('Sêmen adicionado!');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao adicionar');
    } finally {
      setSavingSemen(false);
    }
  }

  async function removerSemen(id: number) {
    try {
      const res = await fetch(`/api/semen/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Erro ao remover');
      setSemens((prev) => prev.filter((s) => s.id !== id));
      toast.success('Sêmen removido!');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao remover');
    }
  }

  function formatDateBR(iso: string | Date) {
    try {
      return new Date(iso).toLocaleDateString('pt-BR');
    } catch { return String(iso); }
  }

  const GENERO_LABEL: Record<string, string> = { MACHO: 'Macho', FEMEA: 'Fêmea' };
  const ROLE_LABEL: Record<string, string> = { ADMIN: 'Admin', SOCIO: 'Sócio' };

  const tickerFields = [
    { key: 'boi_gordo', label: 'Boi Gordo', unidade: 'R$/@' },
    { key: 'vaca_gorda', label: 'Vaca Gorda', unidade: 'R$/@' },
    { key: 'bezerro_8m', label: 'Bezerro 8M', unidade: 'R$' },
    { key: 'garrote_18m', label: 'Garrote 18M', unidade: 'R$' },
  ];

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Settings size={24} className="text-brand-500" />
          Configurações
        </h1>
        <p className="text-slate-500 text-sm mt-1">Gerencie preços, classificações e usuários</p>
      </div>

      {/* Seção 1: Ticker de Preços */}
      <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2 mb-5">
          <TrendingUp size={16} className="text-emerald-500" />
          Ticker de Preços IMEA-MT
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
          {tickerFields.map((f) => (
            <div key={f.key}>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                {f.label}
                <span className="ml-1 text-slate-400 font-normal">({f.unidade})</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">R$</span>
                <input
                  type="number"
                  step="0.01"
                  value={ticker[f.key] ?? ''}
                  onChange={(e) => handleTickerChange(f.key, e.target.value)}
                  className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="0,00"
                />
              </div>
            </div>
          ))}
        </div>
        <button
          onClick={salvarTicker}
          disabled={savingTicker}
          className="px-5 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold transition disabled:opacity-60"
        >
          {savingTicker ? 'Salvando...' : 'Salvar Preços'}
        </button>
      </section>

      {/* Seção 2: Classificações */}
      <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2 mb-2">
          <List size={16} className="text-brand-500" />
          Regras de Classificação
        </h2>
        <p className="text-xs text-slate-500 mb-5">
          Ao salvar, as denominações de todos os animais vivos serão recalculadas automaticamente.
        </p>
        <div className="overflow-x-auto mb-5">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {['Denominação','Gênero','Idade Mín (meses)','Idade Máx (meses)'].map((h) => (
                  <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {classificacoes.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">{c.denominacao}</td>
                  <td className="px-4 py-3 text-slate-600 text-xs">{GENERO_LABEL[c.genero]}</td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      min="0"
                      value={c.idadeMinMeses ?? ''}
                      onChange={(e) => handleClassifChange(c.id, 'idadeMinMeses', e.target.value)}
                      className="w-24 border border-slate-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      min="0"
                      value={c.idadeMaxMeses ?? ''}
                      onChange={(e) => handleClassifChange(c.id, 'idadeMaxMeses', e.target.value)}
                      placeholder="Sem limite"
                      className="w-28 border border-slate-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button
          onClick={salvarClassificacoes}
          disabled={savingClassif}
          className="px-5 py-2.5 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold transition disabled:opacity-60"
        >
          {savingClassif ? 'Salvando e recalculando...' : 'Salvar Regras'}
        </button>
      </section>

      {/* Seção 3: Causas de Morte */}
      <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2 mb-2">
          <Skull size={16} className="text-rose-500" />
          Causas de Morte Predefinidas
        </h2>
        <p className="text-xs text-slate-500 mb-5">
          Estas opções aparecem no formulário de registro de morte. Você pode adicionar ou remover causas.
        </p>
        <div className="space-y-2 mb-5">
          {causasMorte.map((c) => (
            <div key={c.id} className="flex items-center justify-between px-4 py-2.5 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-sm text-slate-700">{c.nome}</span>
              <button
                onClick={() => removerCausa(c.id)}
                className="text-slate-400 hover:text-red-500 transition-colors"
                title="Remover causa"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          {causasMorte.length === 0 && (
            <p className="text-xs text-slate-400 italic">Nenhuma causa cadastrada.</p>
          )}
        </div>
        <div className="flex gap-3">
          <input
            type="text"
            value={novaCausa}
            onChange={(e) => setNovaCausa(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && adicionarCausa()}
            placeholder="Nova causa de morte..."
            className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <button
            onClick={adicionarCausa}
            disabled={savingCausa || !novaCausa.trim()}
            className="px-4 py-2 rounded-lg bg-rose-500 hover:bg-rose-600 text-white text-sm font-semibold transition disabled:opacity-60"
          >
            {savingCausa ? 'Adicionando...' : 'Adicionar'}
          </button>
        </div>
      </section>

      {/* Seção 4: Estações de Monta */}
      <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2 mb-2">
          <Calendar size={16} className="text-teal-500" />
          Estações de Monta
        </h2>
        <p className="text-xs text-slate-500 mb-5">
          Defina os períodos de cada estação. O toque de uma fêmea associará automaticamente o animal à estação correspondente.
        </p>
        <div className="space-y-2 mb-5">
          {estacoes.map((e) => (
            <div key={e.id} className="flex items-center justify-between px-4 py-2.5 rounded-lg bg-slate-50 border border-slate-200">
              <div>
                <span className="text-sm font-medium text-slate-700">{e.nome}</span>
                <span className="ml-3 text-xs text-slate-400">{formatDateBR(e.dataInicio)} → {formatDateBR(e.dataFim)}</span>
              </div>
              <button
                onClick={() => removerEstacao(e.id)}
                className="text-slate-400 hover:text-red-500 transition-colors"
                title="Remover estação"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          {estacoes.length === 0 && (
            <p className="text-xs text-slate-400 italic">Nenhuma estação cadastrada.</p>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input
            type="text"
            value={novaEstacaoNome}
            onChange={(e) => setNovaEstacaoNome(e.target.value)}
            placeholder="Nome (ex: EM 2024/2025)"
            className="md:col-span-2 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <input
            type="date"
            value={novaEstacaoInicio}
            onChange={(e) => setNovaEstacaoInicio(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <input
            type="date"
            value={novaEstacaoFim}
            onChange={(e) => setNovaEstacaoFim(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <button
          onClick={adicionarEstacao}
          disabled={savingEstacao || !novaEstacaoNome.trim() || !novaEstacaoInicio || !novaEstacaoFim}
          className="mt-3 px-4 py-2 rounded-lg bg-teal-500 hover:bg-teal-600 text-white text-sm font-semibold transition disabled:opacity-60"
        >
          {savingEstacao ? 'Adicionando...' : 'Adicionar Estação'}
        </button>
      </section>

      {/* Seção 5: Catálogo de Sêmen */}
      <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2 mb-2">
          <FlaskConical size={16} className="text-indigo-500" />
          Catálogo de Sêmen
        </h2>
        <p className="text-xs text-slate-500 mb-5">
          Sêmens disponíveis para seleção ao registrar inseminação artificial de uma fêmea.
        </p>
        <div className="space-y-2 mb-5">
          {semens.map((s) => (
            <div key={s.id} className="flex items-center justify-between px-4 py-2.5 rounded-lg bg-slate-50 border border-slate-200">
              <div>
                <span className="text-sm font-medium text-slate-700">{s.codigo}</span>
                {s.touro && <span className="ml-3 text-xs text-slate-400">Touro: {s.touro}</span>}
              </div>
              <button
                onClick={() => removerSemen(s.id)}
                className="text-slate-400 hover:text-red-500 transition-colors"
                title="Remover sêmen"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          {semens.length === 0 && (
            <p className="text-xs text-slate-400 italic">Nenhum sêmen cadastrado.</p>
          )}
        </div>
        <div className="flex gap-3">
          <input
            type="text"
            value={novoSemenCodigo}
            onChange={(e) => setNovoSemenCodigo(e.target.value)}
            placeholder="Código (ex: TOURO-ABC-LT01)"
            className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <input
            type="text"
            value={novoSemenTouro}
            onChange={(e) => setNovoSemenTouro(e.target.value)}
            placeholder="Nome do touro (opcional)"
            className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <button
            onClick={adicionarSemen}
            disabled={savingSemen || !novoSemenCodigo.trim()}
            className="px-4 py-2 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-semibold transition disabled:opacity-60"
          >
            {savingSemen ? 'Adicionando...' : 'Adicionar'}
          </button>
        </div>
      </section>

      {/* Seção 6: Usuários */}
      <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2 mb-5">
          <Users size={16} className="text-violet-500" />
          Usuários do Sistema
        </h2>
        <div className="space-y-3">
          {usuarios.map((u) => (
            <div key={u.id} className="flex items-center justify-between p-4 rounded-lg bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white text-sm font-bold">
                  {u.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">{u.name}</p>
                  <p className="text-xs text-slate-500">{u.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${u.role === 'ADMIN' ? 'bg-brand-100 text-brand-700' : 'bg-slate-100 text-slate-600'}`}>
                  {ROLE_LABEL[u.role] ?? u.role}
                </span>
                <button
                  onClick={() => abrirSenha(u)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 text-slate-600 text-xs font-medium hover:bg-white transition"
                >
                  <Key size={12} />
                  Editar Senha
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Drawer senha */}
      <Drawer open={senhaDrawer} onClose={() => setSenhaDrawer(false)} title={`Alterar Senha — ${senhaUserName}`} width="max-w-sm">
        <form onSubmit={handleSubmit(salvarSenha)} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Nova Senha</label>
            <input
              {...register('novaSenha')}
              type="password"
              placeholder="Mínimo 6 caracteres"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            {errors.novaSenha && <p className="text-xs text-red-500 mt-1">{errors.novaSenha.message}</p>}
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Confirmar Senha</label>
            <input
              {...register('confirmarSenha')}
              type="password"
              placeholder="Repita a senha"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            {errors.confirmarSenha && <p className="text-xs text-red-500 mt-1">{errors.confirmarSenha.message}</p>}
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setSenhaDrawer(false)} className="flex-1 py-2.5 rounded-lg border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50 transition">
              Cancelar
            </button>
            <button type="submit" disabled={savingSenha} className="flex-1 py-2.5 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold transition disabled:opacity-60">
              {savingSenha ? 'Salvando...' : 'Salvar Senha'}
            </button>
          </div>
        </form>
      </Drawer>
    </div>
  );
}
