'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Search } from 'lucide-react';
import { Drawer } from '@/components/ui/drawer';

const schema = z.object({
  animalId: z.string().min(1, 'Animal obrigatório'),
  tipo: z.enum(['VACINA', 'MEDICAMENTO']),
  produto: z.string().min(1, 'Produto obrigatório'),
  data: z.string().min(1, 'Data obrigatória'),
  dose: z.string().optional(),
  observacoes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface AnimalBusca {
  id: number;
  numero: string | null;
  denominacao: string;
  proprietario: { name: string };
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export function SanitarioDrawer({ open, onClose, onSaved }: Props) {
  const [loading, setLoading] = useState(false);
  const [buscaAnimal, setBuscaAnimal] = useState('');
  const [animaisBusca, setAnimaisBusca] = useState<AnimalBusca[]>([]);
  const [animalSelecionado, setAnimalSelecionado] = useState<AnimalBusca | null>(null);
  const [buscando, setBuscando] = useState(false);

  const { register, handleSubmit, setValue, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { tipo: 'VACINA' },
  });

  async function buscarAnimal(q: string) {
    if (!q) { setAnimaisBusca([]); return; }
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
      const res = await fetch('/api/sanitario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success('Registro sanitário adicionado!');
      reset();
      setAnimalSelecionado(null);
      setBuscaAnimal('');
      onSaved();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao salvar');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Drawer open={open} onClose={onClose} title="Registro Sanitário">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">Animal *</label>
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
              className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
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
                  className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 flex items-center justify-between border-b border-slate-100 last:border-0"
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
            <p className="text-xs text-slate-500">Animal selecionado:</p>
            <p className="text-sm font-medium text-slate-800">
              {animalSelecionado.numero ? `Nº ${animalSelecionado.numero}` : `#${animalSelecionado.id}`} — {animalSelecionado.denominacao}
            </p>
            <p className="text-xs text-slate-500">{animalSelecionado.proprietario.name}</p>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">Tipo *</label>
          <div className="flex gap-3">
            {(['VACINA', 'MEDICAMENTO'] as const).map((t) => (
              <label key={t} className="flex items-center gap-2 cursor-pointer">
                <input type="radio" value={t} {...register('tipo')} className="text-brand-500" />
                <span className="text-sm text-slate-700">{t === 'VACINA' ? 'Vacina' : 'Medicamento'}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">Produto *</label>
          <input
            {...register('produto')}
            placeholder="Nome do produto/vacina"
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          {errors.produto && <p className="text-xs text-red-500 mt-1">{errors.produto.message}</p>}
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">Data *</label>
          <input
            {...register('data')}
            type="date"
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          {errors.data && <p className="text-xs text-red-500 mt-1">{errors.data.message}</p>}
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">Dose</label>
          <input
            {...register('dose')}
            placeholder="Ex: 5ml, 2 comprimidos"
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">Observações</label>
          <textarea
            {...register('observacoes')}
            rows={3}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50 transition">
            Cancelar
          </button>
          <button type="submit" disabled={loading} className="flex-1 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold transition disabled:opacity-60">
            {loading ? 'Salvando...' : 'Salvar Registro'}
          </button>
        </div>
      </form>
    </Drawer>
  );
}
