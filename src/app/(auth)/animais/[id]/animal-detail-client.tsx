'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { ArrowLeft, Skull, Syringe, Plus, Trash2, HeartPulse } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { DatePickerBR } from '@/components/ui/date-picker-br';
import { formatDateBR } from '@/lib/utils';
import { Drawer } from '@/components/ui/drawer';

const schema = z.object({
  numero: z.string().optional(),
  proprietarioId: z.string().min(1),
  genero: z.enum(['MACHO', 'FEMEA']),
  status: z.enum(['VIVO', 'MORTO', 'VENDIDO']),
  eraMes: z.string().optional(),
  eraAno: z.string().optional(),
  peso: z.string().optional(),
  reprodutor: z.boolean().default(false),
  observacoes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const sanitarioSchema = z.object({
  tipo: z.enum(['VACINA', 'MEDICAMENTO']),
  produto: z.string().min(1, 'Produto obrigatório'),
  data: z.string().min(1, 'Data obrigatória'),
  dose: z.string().optional(),
  observacoes: z.string().optional(),
});

type SanitarioData = z.infer<typeof sanitarioSchema>;

const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

interface RegistroSanitario {
  id: number;
  tipo: 'VACINA' | 'MEDICAMENTO';
  produto: string;
  data: string;
  dose: string | null;
  observacoes: string | null;
}

interface Morte {
  id: number;
  dataObito: string;
  causa: string | null;
  observacoes: string | null;
}

interface ReproducaoItem {
  id: number;
  statusReprodutivo: string | null;
  dataToque: string | null;
  dataInseminacao: string | null;
  inseminada: boolean;
  ultimoPartoMes: number | null;
  ultimoPartoAno: number | null;
  nuncaPariu: boolean;
  observacoes: string | null;
  createdAt: string;
  estacaoMonta: { nome: string } | null;
  semen: { codigo: string; touro: string | null } | null;
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
  dataVenda: string | null;
  reprodutor: boolean;
  observacoes: string | null;
  proprietarioId: number;
  proprietario: { id: number; name: string };
  morte: Morte | null;
  registrosSanitarios: RegistroSanitario[];
  reproducoes: ReproducaoItem[];
}

interface Props {
  animal: Animal;
  proprietarios: { id: number; name: string }[];
}

export function AnimalDetailClient({ animal: initialAnimal, proprietarios }: Props) {
  const router = useRouter();
  const [animal, setAnimal] = useState(initialAnimal);
  const [saving, setSaving] = useState(false);
  const [sanitarioDrawer, setSanitarioDrawer] = useState(false);
  const [savingSanitario, setSavingSanitario] = useState(false);

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      numero: animal.numero ?? '',
      proprietarioId: String(animal.proprietarioId),
      genero: animal.genero,
      status: animal.status,
      eraMes: animal.eraMes ? String(animal.eraMes) : '',
      eraAno: animal.eraAno ? String(animal.eraAno) : '',
      peso: animal.peso ? String(animal.peso) : '',
      reprodutor: animal.reprodutor,
      observacoes: animal.observacoes ?? '',
    },
  });

  const { register: regS, handleSubmit: handleS, watch: watchS, setValue: setValueS, reset: resetS, formState: { errors: errS } } = useForm<SanitarioData>({
    resolver: zodResolver(sanitarioSchema),
    defaultValues: { tipo: 'VACINA' },
  });

  async function onSubmit(data: FormData) {
    setSaving(true);
    try {
      const res = await fetch(`/api/animais/${animal.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const updated = await res.json();
      setAnimal(updated);
      toast.success('Animal atualizado!');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  }

  async function handleSanitario(data: SanitarioData) {
    setSavingSanitario(true);
    try {
      const res = await fetch('/api/sanitario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, animalId: animal.id }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const registro = await res.json();
      setAnimal((prev) => ({
        ...prev,
        registrosSanitarios: [registro, ...prev.registrosSanitarios],
      }));
      toast.success('Registro sanitário adicionado!');
      resetS();
      setSanitarioDrawer(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao salvar');
    } finally {
      setSavingSanitario(false);
    }
  }

  async function handleDeleteSanitario(id: number) {
    if (!confirm('Excluir este registro sanitário?')) return;
    try {
      await fetch(`/api/sanitario/${id}`, { method: 'DELETE' });
      setAnimal((prev) => ({
        ...prev,
        registrosSanitarios: prev.registrosSanitarios.filter((r) => r.id !== id),
      }));
      toast.success('Registro excluído');
    } catch {
      toast.error('Erro ao excluir');
    }
  }


  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link href="/animais" className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 mb-2 transition">
            <ArrowLeft size={14} />
            Voltar à lista
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">
              Animal #{animal.id}{animal.numero ? ` — Nº ${animal.numero}` : ''}
            </h1>
            <Badge variant="denominacao" value={animal.denominacao}>{animal.denominacao}</Badge>
            <Badge variant="status" value={animal.status}>{animal.status === 'VIVO' ? 'Vivo' : animal.status === 'VENDIDO' ? 'Vendido' : 'Morto'}</Badge>
          </div>
          <p className="text-slate-500 text-sm mt-1">Proprietário: {animal.proprietario.name}</p>
        </div>

        {animal.status === 'VIVO' && (
          <Link
            href={`/mortes?animalId=${animal.id}`}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-medium transition"
          >
            <Skull size={16} />
            Registrar Morte
          </Link>
        )}
      </div>

      {/* Form */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <h2 className="text-base font-semibold text-slate-800 mb-5">Dados do Animal</h2>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Número</label>
              <input
                {...register('numero')}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Proprietário</label>
              <select
                {...register('proprietarioId')}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
              >
                {proprietarios.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Gênero</label>
              <div className="flex gap-4">
                {(['MACHO', 'FEMEA'] as const).map((g) => (
                  <label key={g} className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" value={g} {...register('genero')} />
                    <span className="text-sm">{g === 'MACHO' ? 'Macho' : 'Fêmea'}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Status</label>
              <select
                {...register('status')}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
              >
                <option value="VIVO">Vivo</option>
                <option value="MORTO">Morto</option>
                <option value="VENDIDO">Vendido</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Mês de Nascimento</label>
              <select
                {...register('eraMes')}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
              >
                <option value="">--</option>
                {MESES.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Ano de Nascimento</label>
              <input
                {...register('eraAno')}
                type="number"
                min="2000"
                max={new Date().getFullYear()}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Peso (kg)</label>
              <input
                {...register('peso')}
                type="number"
                step="0.1"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div className="flex items-center gap-2 pt-5">
              <input
                type="checkbox"
                id="reprodutor"
                defaultChecked={animal.reprodutor}
                onChange={(e) => setValue('reprodutor', e.target.checked)}
                className="w-4 h-4 text-brand-500 rounded border-slate-300"
              />
              <label htmlFor="reprodutor" className="text-sm text-slate-700 cursor-pointer">Reprodutor (Touro)</label>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Observações</label>
            <textarea
              {...register('observacoes')}
              rows={3}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold transition disabled:opacity-60"
            >
              {saving ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>
        </form>
      </div>

      {/* Morte */}
      {animal.morte && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <h2 className="text-base font-semibold text-red-800 mb-3 flex items-center gap-2">
            <Skull size={16} />
            Registro de Óbito
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-xs text-red-600 font-medium">Data do Óbito</p>
              <p className="text-red-900">{formatDateBR(animal.morte.dataObito)}</p>
            </div>
            {animal.morte.causa && (
              <div>
                <p className="text-xs text-red-600 font-medium">Causa</p>
                <p className="text-red-900">{animal.morte.causa}</p>
              </div>
            )}
            {animal.morte.observacoes && (
              <div>
                <p className="text-xs text-red-600 font-medium">Observações</p>
                <p className="text-red-900">{animal.morte.observacoes}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Reprodução */}
      {animal.genero === 'FEMEA' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-base font-semibold text-slate-800 mb-5 flex items-center gap-2">
            <HeartPulse size={16} className="text-pink-500" />
            Histórico Reprodutivo ({animal.reproducoes.length})
          </h2>

          {animal.reproducoes.length === 0 ? (
            <div className="py-10 text-center">
              <HeartPulse size={32} className="text-slate-300 mx-auto mb-2" />
              <p className="text-slate-500 text-sm">Nenhum registro reprodutivo</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    {['Status','Último Parto','Data Toque','Estação','IA','Data IA','Sêmen','Obs'].map((h) => (
                      <th key={h} className="text-left px-3 py-2 text-xs font-semibold text-slate-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {animal.reproducoes.map((r) => {
                    const statusLabel: Record<string, string> = { CHEIA: 'Cheia (Prenha)', VAZIA: 'Vazia' };
                    const statusColor: Record<string, string> = { CHEIA: 'bg-green-100 text-green-800', VAZIA: 'bg-red-100 text-red-800' };
                    return (
                      <tr key={r.id} className="hover:bg-slate-50">
                        <td className="px-3 py-2">
                          {r.statusReprodutivo
                            ? <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${statusColor[r.statusReprodutivo] ?? 'bg-slate-100 text-slate-700'}`}>{statusLabel[r.statusReprodutivo] ?? r.statusReprodutivo}</span>
                            : <span className="text-slate-400">—</span>}
                        </td>
                        <td className="px-3 py-2 text-slate-600 text-xs">
                          {r.statusReprodutivo === 'VAZIA'
                            ? r.nuncaPariu
                              ? <span className="text-amber-600 font-medium">Primípara</span>
                              : (r.ultimoPartoMes && r.ultimoPartoAno ? `${String(r.ultimoPartoMes).padStart(2,'0')}/${r.ultimoPartoAno}` : '—')
                            : '—'}
                        </td>
                        <td className="px-3 py-2 text-slate-600">{r.dataToque ? formatDateBR(r.dataToque) : '—'}</td>
                        <td className="px-3 py-2 text-slate-600">{r.estacaoMonta?.nome ?? '—'}</td>
                        <td className="px-3 py-2 text-xs">{r.inseminada ? <span className="text-green-700 font-semibold">Sim</span> : <span className="text-slate-400">Não</span>}</td>
                        <td className="px-3 py-2 text-slate-600">{r.dataInseminacao ? formatDateBR(r.dataInseminacao) : '—'}</td>
                        <td className="px-3 py-2 text-slate-600">{r.semen ? `${r.semen.codigo}${r.semen.touro ? ` (${r.semen.touro})` : ''}` : '—'}</td>
                        <td className="px-3 py-2 text-slate-500 max-w-xs truncate">{r.observacoes ?? '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Sanitário */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
            <Syringe size={16} className="text-emerald-500" />
            Registros Sanitários ({animal.registrosSanitarios.length})
          </h2>
          <button
            onClick={() => setSanitarioDrawer(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold transition"
          >
            <Plus size={12} />
            Adicionar
          </button>
        </div>

        {animal.registrosSanitarios.length === 0 ? (
          <div className="py-10 text-center">
            <Syringe size={32} className="text-slate-300 mx-auto mb-2" />
            <p className="text-slate-500 text-sm">Nenhum registro sanitário</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {['Tipo','Produto','Data','Dose','Observações',''].map((h) => (
                    <th key={h} className="text-left px-3 py-2 text-xs font-semibold text-slate-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {animal.registrosSanitarios.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${r.tipo === 'VACINA' ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'}`}>
                        {r.tipo}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-slate-700 font-medium">{r.produto}</td>
                    <td className="px-3 py-2 text-slate-600">{formatDateBR(r.data)}</td>
                    <td className="px-3 py-2 text-slate-600">{r.dose ?? '—'}</td>
                    <td className="px-3 py-2 text-slate-500 max-w-xs truncate">{r.observacoes ?? '—'}</td>
                    <td className="px-3 py-2">
                      <button
                        onClick={() => handleDeleteSanitario(r.id)}
                        className="p-1 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 transition"
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Sanitário Drawer */}
      <Drawer open={sanitarioDrawer} onClose={() => setSanitarioDrawer(false)} title="Registro Sanitário">
        <form onSubmit={handleS(handleSanitario)} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Tipo *</label>
            <select
              {...regS('tipo')}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
            >
              <option value="VACINA">Vacina</option>
              <option value="MEDICAMENTO">Medicamento</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Produto *</label>
            <input
              {...regS('produto')}
              placeholder="Nome do produto"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            {errS.produto && <p className="text-xs text-red-500 mt-1">{errS.produto.message}</p>}
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Data *</label>
            <DatePickerBR
              value={watchS('data') || null}
              onChange={(v) => setValueS('data', v ?? '')}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Dose</label>
            <input
              {...regS('dose')}
              placeholder="Ex: 5ml"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Observações</label>
            <textarea
              {...regS('observacoes')}
              rows={3}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setSanitarioDrawer(false)} className="flex-1 py-2.5 rounded-lg border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50 transition">Cancelar</button>
            <button type="submit" disabled={savingSanitario} className="flex-1 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold transition disabled:opacity-60">
              {savingSanitario ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </Drawer>
    </div>
  );
}
