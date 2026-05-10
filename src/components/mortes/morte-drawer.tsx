'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Search } from 'lucide-react';
import { Drawer } from '@/components/ui/drawer';

const schema = z.object({
  animalId: z.string().min(1, 'Animal obrigatório'),
  dataObito: z.string().min(1, 'Data obrigatória'),
  causa: z.string().optional(),
  causaCustom: z.string().optional(),
  observacoes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface AnimalBusca {
  id: number;
  numero: string | null;
  denominacao: string;
  proprietario: { name: string };
}

interface CausaMorte {
  id: number;
  nome: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  preAnimalId?: number | null;
}

const inputClass =
  'w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all';

export function MorteDrawer({ open, onClose, onSaved, preAnimalId }: Props) {
  const [loading, setLoading] = useState(false);
  const [buscaAnimal, setBuscaAnimal] = useState('');
  const [animaisBusca, setAnimaisBusca] = useState<AnimalBusca[]>([]);
  const [animalSelecionado, setAnimalSelecionado] = useState<AnimalBusca | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [causas, setCausas] = useState<CausaMorte[]>([]);

  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { animalId: preAnimalId ? String(preAnimalId) : '' },
  });

  useEffect(() => {
    fetch('/api/causas-morte')
      .then((r) => r.json())
      .then((data) => setCausas(Array.isArray(data) ? data : []))
      .catch(() => setCausas([]));
  }, []);

  const causaSelecionada = watch('causa');

  async function buscarAnimal(q: string) {
    if (!q || q.length < 1) { setAnimaisBusca([]); return; }
    setBuscando(true);
    try {
      const params = new URLSearchParams({ numero: q, status: 'VIVO', limit: '10' });
      const res = await fetch(`/api/animais?${params}`);
      const data = await res.json();
      setAnimaisBusca(data.animais ?? []);
    } catch {
      setAnimaisBusca([]);
    } finally {
      setBuscando(false);
    }
  }

  function selecionarAnimal(animal: AnimalBusca) {
    setAnimalSelecionado(animal);
    setValue('animalId', String(animal.id));
    setBuscaAnimal(animal.numero ? `Nº ${animal.numero} — ${animal.denominacao}` : `#${animal.id} — ${animal.denominacao}`);
    setAnimaisBusca([]);
  }

  async function onSubmit(data: FormData) {
    setLoading(true);
    try {
      const causaFinal = data.causa === '__outra__' ? (data.causaCustom ?? '') : (data.causa ?? '');
      const res = await fetch('/api/mortes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          animalId: data.animalId,
          dataObito: data.dataObito,
          causa: causaFinal || null,
          observacoes: data.observacoes || null,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success('Morte registrada com sucesso!');
      reset();
      setAnimalSelecionado(null);
      setBuscaAnimal('');
      onSaved();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao registrar morte');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Drawer open={open} onClose={onClose} title="Registrar Morte">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Animal *</label>
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={buscaAnimal}
              onChange={(e) => {
                setBuscaAnimal(e.target.value);
                setAnimalSelecionado(null);
                setValue('animalId', '');
                buscarAnimal(e.target.value);
              }}
              placeholder="Buscar por número do animal..."
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
            />
          </div>
          {buscando && <p className="text-xs text-slate-400 mt-1">Buscando...</p>}
          {animaisBusca.length > 0 && (
            <div className="mt-1 border border-slate-200 rounded-lg overflow-hidden shadow-sm">
              {animaisBusca.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => selecionarAnimal(a)}
                  className="w-full text-left px-3 py-2.5 text-sm hover:bg-slate-50 flex items-center justify-between border-b border-slate-100 last:border-0 transition-colors"
                >
                  <span className="font-medium text-slate-800">
                    {a.numero ? `Nº ${a.numero}` : `#${a.id}`} — {a.denominacao}
                  </span>
                  <span className="text-xs text-slate-400">{a.proprietario.name}</span>
                </button>
              ))}
            </div>
          )}
          {errors.animalId && <p className="text-xs text-red-500 mt-1">{errors.animalId.message}</p>}
          <input type="hidden" {...register('animalId')} />
        </div>

        {animalSelecionado && (
          <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
            <p className="text-xs text-slate-500 mb-0.5">Animal selecionado</p>
            <p className="text-sm font-medium text-slate-800">
              {animalSelecionado.numero ? `Nº ${animalSelecionado.numero}` : `#${animalSelecionado.id}`} — {animalSelecionado.denominacao}
            </p>
            <p className="text-xs text-slate-500">{animalSelecionado.proprietario.name}</p>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Data do Óbito *</label>
          <input {...register('dataObito')} type="date" className={inputClass} />
          {errors.dataObito && <p className="text-xs text-red-500 mt-1">{errors.dataObito.message}</p>}
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Causa da Morte</label>
          <select
            {...register('causa')}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
          >
            <option value="">Selecione a causa...</option>
            {causas.map((c) => (
              <option key={c.id} value={c.nome}>{c.nome}</option>
            ))}
            <option value="__outra__">Outra (digitar)</option>
          </select>
        </div>

        {causaSelecionada === '__outra__' && (
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Descreva a causa</label>
            <input
              {...register('causaCustom')}
              placeholder="Ex: Intoxicação por planta"
              className={inputClass}
            />
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Observações</label>
          <textarea
            {...register('observacoes')}
            rows={3}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all resize-none"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-all"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Registrando...' : 'Registrar Morte'}
          </button>
        </div>
      </form>
    </Drawer>
  );
}
