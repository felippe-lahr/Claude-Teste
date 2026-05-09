'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Drawer } from '@/components/ui/drawer';
import { Badge } from '@/components/ui/badge';

const schema = z.object({
  numero: z.string().optional(),
  proprietarioId: z.string().min(1, 'Proprietário obrigatório'),
  genero: z.enum(['MACHO', 'FEMEA'], { required_error: 'Gênero obrigatório' }),
  status: z.enum(['VIVO', 'MORTO']).default('VIVO'),
  eraMes: z.string().optional(),
  eraAno: z.string().optional(),
  peso: z.string().optional(),
  reprodutor: z.boolean().default(false),
  observacoes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface Proprietario {
  id: number;
  name: string;
}

interface AnimalData {
  id?: number;
  numero?: string | null;
  proprietarioId: number;
  genero: 'MACHO' | 'FEMEA';
  status: 'VIVO' | 'MORTO';
  eraMes?: number | null;
  eraAno?: number | null;
  peso?: number | null;
  reprodutor: boolean;
  observacoes?: string | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  animal?: AnimalData | null;
  proprietarios: Proprietario[];
  onSaved: () => void;
}

const inputClass =
  'w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all';

const selectClass =
  'w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all';

export function AnimalDrawer({ open, onClose, animal, proprietarios, onSaved }: Props) {
  const [loading, setLoading] = useState(false);
  const [denominacao, setDenominacao] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);

  const { register, handleSubmit, watch, reset, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { status: 'VIVO', reprodutor: false },
  });

  useEffect(() => {
    if (open) {
      if (animal) {
        reset({
          numero: animal.numero ?? '',
          proprietarioId: String(animal.proprietarioId),
          genero: animal.genero,
          status: animal.status,
          eraMes: animal.eraMes ? String(animal.eraMes) : '',
          eraAno: animal.eraAno ? String(animal.eraAno) : '',
          peso: animal.peso ? String(animal.peso) : '',
          reprodutor: animal.reprodutor,
          observacoes: animal.observacoes ?? '',
        });
      } else {
        reset({ status: 'VIVO', reprodutor: false });
        setDenominacao('');
      }
    }
  }, [open, animal, reset]);

  const genero = watch('genero');
  const eraMes = watch('eraMes');
  const eraAno = watch('eraAno');
  const reprodutor = watch('reprodutor');

  useEffect(() => {
    if (!genero) return;
    setPreviewLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch('/api/animais/preview-denominacao', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ genero, eraMes, eraAno, reprodutor }),
        });
        const data = await res.json();
        setDenominacao(data.denominacao ?? '');
      } catch {
        setDenominacao('');
      } finally {
        setPreviewLoading(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [genero, eraMes, eraAno, reprodutor]);

  async function onSubmit(data: FormData) {
    setLoading(true);
    try {
      const url = animal?.id ? `/api/animais/${animal.id}` : '/api/animais';
      const method = animal?.id ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? 'Erro ao salvar');
      }

      toast.success(animal?.id ? 'Animal atualizado com sucesso!' : 'Animal cadastrado com sucesso!');
      onSaved();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao salvar');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Drawer open={open} onClose={onClose} title={animal?.id ? 'Editar Animal' : 'Cadastrar Animal'}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Preview denominação */}
        {denominacao && (
          <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
            <p className="text-xs text-slate-500 mb-1">Denominação calculada:</p>
            <Badge variant="denominacao" value={denominacao}>
              {previewLoading ? 'Calculando...' : denominacao}
            </Badge>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Número (opcional)</label>
          <input
            {...register('numero')}
            placeholder="Ex: 001"
            className={inputClass}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Proprietário *</label>
          <select {...register('proprietarioId')} className={selectClass}>
            <option value="">Selecione...</option>
            {proprietarios.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          {errors.proprietarioId && <p className="text-xs text-red-500 mt-1">{errors.proprietarioId.message}</p>}
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Gênero *</label>
          <div className="flex gap-4">
            {(['MACHO', 'FEMEA'] as const).map((g) => (
              <label key={g} className="flex items-center gap-2 cursor-pointer">
                <input type="radio" value={g} {...register('genero')} className="text-indigo-500 focus:ring-indigo-500" />
                <span className="text-sm text-slate-700">{g === 'MACHO' ? 'Macho' : 'Fêmea'}</span>
              </label>
            ))}
          </div>
          {errors.genero && <p className="text-xs text-red-500 mt-1">{errors.genero.message}</p>}
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Status</label>
          <select {...register('status')} className={selectClass}>
            <option value="VIVO">Vivo</option>
            <option value="MORTO">Morto</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Mês de Nascimento</label>
            <select {...register('eraMes')} className={selectClass}>
              <option value="">--</option>
              {['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'].map((m, i) => (
                <option key={i + 1} value={i + 1}>{m}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Ano de Nascimento</label>
            <input
              {...register('eraAno')}
              type="number"
              placeholder="Ex: 2022"
              min="2000"
              max={new Date().getFullYear()}
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Peso (kg)</label>
          <input
            {...register('peso')}
            type="number"
            step="0.1"
            placeholder="Ex: 350.5"
            className={inputClass}
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="reprodutor"
            {...register('reprodutor')}
            onChange={(e) => setValue('reprodutor', e.target.checked)}
            className="w-4 h-4 text-indigo-500 rounded border-slate-300 focus:ring-indigo-500"
          />
          <label htmlFor="reprodutor" className="text-sm text-slate-700 cursor-pointer">
            Reprodutor (Touro)
          </label>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Observações</label>
          <textarea
            {...register('observacoes')}
            rows={3}
            placeholder="Observações gerais..."
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
            {loading ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </form>
    </Drawer>
  );
}
