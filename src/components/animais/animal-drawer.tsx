'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Plus, X, Syringe, HeartPulse } from 'lucide-react';
import { Drawer } from '@/components/ui/drawer';
import { Badge } from '@/components/ui/badge';
import { DatePickerBR } from '@/components/ui/date-picker-br';
import { parseDateBR, formatDateBR } from '@/lib/utils';

const schema = z.object({
  numero: z.string().optional(),
  proprietarioId: z.string().min(1, 'Proprietário obrigatório'),
  genero: z.enum(['MACHO', 'FEMEA'], { required_error: 'Gênero obrigatório' }),
  status: z.enum(['VIVO', 'MORTO', 'VENDIDO']).default('VIVO'),
  eraMes: z.string().optional(),
  eraAno: z.string().optional(),
  peso: z.string().optional(),
  reprodutor: z.boolean().default(false),
  descarte: z.boolean().default(false),
  observacoes: z.string().optional(),
  dataVenda: z.string().optional(),
  dataObito: z.string().optional(),
  causaMorte: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface VacinaInput {
  produto: string;
  data: string;
  dose: string;
}

interface VacinaExistente {
  id: number;
  produto: string;
  data: string;
  dose: string | null;
}

interface CausaMorte {
  id: number;
  nome: string;
}

interface EstacaoMonta {
  id: number;
  nome: string;
  dataInicio: string;
  dataFim: string;
}

interface SemenItem {
  id: number;
  codigo: string;
  touro: string | null;
}

interface ReproducaoHistorico {
  id: number;
  statusReprodutivo: string | null;
  dataToque: string | null;
  inseminada: boolean;
  dataInseminacao: string | null;
  montaNatural: boolean;
  dataMontaNatural: string | null;
  ultimoPartoMes: number | null;
  ultimoPartoAno: number | null;
  nuncaPariu: boolean;
  observacoes: string | null;
  estacaoMonta: { nome: string } | null;
  semen: { codigo: string; touro: string | null } | null;
}

interface Proprietario {
  id: number;
  name: string;
}

interface AnimalData {
  id?: number;
  numero?: string | null;
  proprietarioId: number;
  genero: 'MACHO' | 'FEMEA';
  status: 'VIVO' | 'MORTO' | 'VENDIDO';
  eraMes?: number | null;
  eraAno?: number | null;
  peso?: number | null;
  reprodutor: boolean;
  descarte?: boolean;
  observacoes?: string | null;
  dataVenda?: string | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  animal?: AnimalData | null;
  proprietarios: Proprietario[];
  onSaved: () => void;
}

const inputClass =
  'w-full border border-[#E8E8E3] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2F6A47] focus:border-[#2F6A47]';

const selectClass =
  'w-full border border-[#E8E8E3] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2F6A47] focus:border-[#2F6A47] bg-white';

const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

export function AnimalDrawer({ open, onClose, animal, proprietarios, onSaved }: Props) {
  const [loading, setLoading] = useState(false);
  const [denominacao, setDenominacao] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [vacinas, setVacinas] = useState<VacinaInput[]>([]);
  const [vacinasExistentes, setVacinasExistentes] = useState<VacinaExistente[]>([]);
  const [causas, setCausas] = useState<CausaMorte[]>([]);
  const [jaTemMorte, setJaTemMorte] = useState(false);
  const [loteInfo, setLoteInfo] = useState<{ nome: string; status: string; comprador: string | null; dataFechamento: string | null } | null>(null);

  // Reprodução
  const [estacoes, setEstacoes] = useState<EstacaoMonta[]>([]);
  const [semens, setSemens] = useState<SemenItem[]>([]);
  const [reproducoes, setReproducoes] = useState<ReproducaoHistorico[]>([]);
  const [reproStatus, setReproStatus] = useState('');
  const [dataToque, setDataToque] = useState('');
  const [estacaoDetectada, setEstacaoDetectada] = useState<EstacaoMonta | null>(null);
  const [inseminada, setInseminada] = useState(false);
  const [dataInseminacao, setDataInseminacao] = useState('');
  const [semenId, setSemenId] = useState('');
  const [montaNatural, setMontaNatural] = useState(false);
  const [dataMontaNatural, setDataMontaNatural] = useState('');
  const [estacaoMontaNatural, setEstacaoMontaNatural] = useState<EstacaoMonta | null>(null);
  const [ultimoPartoMes, setUltimoPartoMes] = useState('');
  const [ultimoPartoAno, setUltimoPartoAno] = useState('');
  const [nuncaPariu, setNuncaPariu] = useState(false);
  const [observacoesRepro, setObservacoesRepro] = useState('');

  const { register, handleSubmit, watch, reset, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { status: 'VIVO', reprodutor: false, descarte: false },
  });

  useEffect(() => {
    fetch('/api/causas-morte')
      .then((r) => r.json())
      .then((data) => setCausas(Array.isArray(data) ? data : []))
      .catch(() => setCausas([]));
    fetch('/api/estacoes-monta')
      .then((r) => r.json())
      .then((data) => setEstacoes(Array.isArray(data) ? data : []))
      .catch(() => setEstacoes([]));
    fetch('/api/semen')
      .then((r) => r.json())
      .then((data) => setSemens(Array.isArray(data) ? data : []))
      .catch(() => setSemens([]));
  }, []);

  useEffect(() => {
    if (open) {
      setVacinasExistentes([]);
      setReproducoes([]);
      setJaTemMorte(false);
      setLoteInfo(null);
      setReproStatus('');
      setDataToque('');
      setEstacaoDetectada(null);
      setInseminada(false);
      setDataInseminacao('');
      setSemenId('');
      setMontaNatural(false);
      setDataMontaNatural('');
      setEstacaoMontaNatural(null);
      setUltimoPartoMes('');
      setUltimoPartoAno('');
      setNuncaPariu(false);
      setObservacoesRepro('');
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
          descarte: animal.descarte ?? false,
          observacoes: animal.observacoes ?? '',
          dataVenda: animal.dataVenda ? formatDateBR(animal.dataVenda) : '',
        });
        // Fetch existing sanitário records and morte data
        if (animal.id) {
          fetch(`/api/animais/${animal.id}`)
            .then((r) => r.json())
            .then((data) => {
              const vacinas = (data.registrosSanitarios ?? []).filter(
                (r: { tipo: string }) => r.tipo === 'VACINA'
              );
              setVacinasExistentes(vacinas.map((v: { id: number; produto: string; data: string; dose: string | null }) => ({
                id: v.id,
                produto: v.produto,
                data: v.data,
                dose: v.dose,
              })));
              if (data.morte) setJaTemMorte(true);
              setReproducoes(data.reproducoes ?? []);
              if (data.loteItems && data.loteItems.length > 0) {
                const item = data.loteItems[0];
                setLoteInfo(item.lote ?? null);
              }
            })
            .catch(() => {});
        }
      } else {
        reset({ status: 'VIVO', reprodutor: false, descarte: false });
        setDenominacao('');
        setVacinas([]);
      }
    }
  }, [open, animal, reset]);

  const genero = watch('genero');
  const eraMes = watch('eraMes');
  const eraAno = watch('eraAno');
  const reprodutor = watch('reprodutor');
  const status = watch('status');

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

  useEffect(() => {
    if (!dataToque) { setEstacaoDetectada(null); return; }
    const dt = parseDateBR(dataToque) ?? new Date(dataToque);
    const found = estacoes.find((e) => new Date(e.dataInicio) <= dt && new Date(e.dataFim) >= dt);
    setEstacaoDetectada(found ?? null);
  }, [dataToque, estacoes]);

  useEffect(() => {
    if (!dataMontaNatural) { setEstacaoMontaNatural(null); return; }
    const dt = parseDateBR(dataMontaNatural) ?? new Date(dataMontaNatural);
    const found = estacoes.find((e) => new Date(e.dataInicio) <= dt && new Date(e.dataFim) >= dt);
    setEstacaoMontaNatural(found ?? null);
  }, [dataMontaNatural, estacoes]);

  function addVacina() {
    setVacinas((prev) => [...prev, { produto: '', data: '', dose: '' }]);
  }

  function removeVacina(index: number) {
    setVacinas((prev) => prev.filter((_, i) => i !== index));
  }

  function updateVacina(index: number, field: keyof VacinaInput, value: string) {
    setVacinas((prev) => prev.map((v, i) => i === index ? { ...v, [field]: value } : v));
  }

  async function onSubmit(data: FormData) {
    setLoading(true);
    try {
      const url = animal?.id ? `/api/animais/${animal.id}` : '/api/animais';
      const method = animal?.id ? 'PUT' : 'POST';

      const vacinasValidas = vacinas.filter((v) => v.produto.trim() && v.data);

      const reproPayload = data.genero === 'FEMEA' ? {
        statusReprodutivo: reproStatus || null,
        dataToque: dataToque || null,
        inseminada,
        dataInseminacao: inseminada && dataInseminacao ? dataInseminacao : null,
        semenId: inseminada && semenId ? semenId : null,
        montaNatural,
        dataMontaNatural: montaNatural && dataMontaNatural ? dataMontaNatural : null,
        ultimoPartoMes: reproStatus === 'VAZIA' && !nuncaPariu && ultimoPartoMes ? parseInt(ultimoPartoMes) : null,
        ultimoPartoAno: reproStatus === 'VAZIA' && !nuncaPariu && ultimoPartoAno ? parseInt(ultimoPartoAno) : null,
        nuncaPariu: reproStatus === 'VAZIA' ? nuncaPariu : false,
        observacoesRepro: observacoesRepro || null,
      } : undefined;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          dataVenda: data.status === 'VENDIDO' && data.dataVenda ? data.dataVenda : null,
          dataObito: data.status === 'MORTO' && data.dataObito ? data.dataObito : null,
          causaMorte: data.status === 'MORTO' ? (data.causaMorte ?? null) : null,
          vacinas: vacinasValidas.length > 0 ? vacinasValidas : undefined,
          reproducao: reproPayload,
        }),
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

  function formatData(isoString: string) {
    try {
      const d = new Date(isoString);
      return `${MESES[d.getUTCMonth()]}/${d.getUTCFullYear()}`;
    } catch {
      return isoString;
    }
  }

  return (
    <Drawer open={open} onClose={onClose} title={animal?.id ? 'Editar Animal' : 'Cadastrar Animal'}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Preview denominação */}
        {denominacao && (
          <div className="bg-[#F5F4EF] rounded-lg p-3 border border-[#E8E8E3]">
            <p className="text-xs text-[#6B6B65] mb-1">Denominação calculada:</p>
            <Badge variant="denominacao" value={denominacao}>
              {previewLoading ? 'Calculando...' : denominacao}
            </Badge>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-[#111110] mb-1.5">Número (opcional)</label>
          <input {...register('numero')} placeholder="Ex: 001" className={inputClass} />
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#111110] mb-1.5">Proprietário *</label>
          <select {...register('proprietarioId')} className={selectClass}>
            <option value="">Selecione...</option>
            {proprietarios.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          {errors.proprietarioId && <p className="text-xs text-red-500 mt-1">{errors.proprietarioId.message}</p>}
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#111110] mb-1.5">Gênero *</label>
          <div className="flex gap-3">
            {(['MACHO', 'FEMEA'] as const).map((g) => (
              <label key={g} className="flex items-center gap-2 cursor-pointer">
                <input type="radio" value={g} {...register('genero')} className="text-[#2F6A47]" />
                <span className="text-sm text-[#111110]">{g === 'MACHO' ? 'Macho' : 'Fêmea'}</span>
              </label>
            ))}
          </div>
          {errors.genero && <p className="text-xs text-red-500 mt-1">{errors.genero.message}</p>}
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#111110] mb-1.5">Status</label>
          <select {...register('status')} className={selectClass}>
            <option value="VIVO">Vivo</option>
            <option value="MORTO">Morto</option>
            <option value="VENDIDO">Vendido</option>
          </select>
        </div>

        {/* Campos de morte — aparecem quando status=MORTO e ainda não tem registro de morte */}
        {status === 'MORTO' && !jaTemMorte && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-3">
            <p className="text-xs font-semibold text-red-700 uppercase tracking-wide">Registro de Óbito</p>
            <div>
              <label className="block text-xs font-semibold text-[#111110] mb-1.5">Data do Óbito</label>
              <DatePickerBR
                value={watch('dataObito') || null}
                onChange={(v) => setValue('dataObito', v ?? '')}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#111110] mb-1.5">Causa da Morte</label>
              <select {...register('causaMorte')} className={selectClass}>
                <option value="">Selecione a causa...</option>
                {causas.map((c) => (
                  <option key={c.id} value={c.nome}>{c.nome}</option>
                ))}
                <option value="__outra__">Outra</option>
              </select>
            </div>
          </div>
        )}

        {status === 'MORTO' && jaTemMorte && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            <p className="text-xs text-red-600">Este animal já possui registro de óbito cadastrado.</p>
          </div>
        )}

        {status === 'VENDIDO' && (
          <div>
            <label className="block text-xs font-semibold text-[#111110] mb-1.5">Data da Venda</label>
            <DatePickerBR
              value={watch('dataVenda') || null}
              onChange={(v) => setValue('dataVenda', v ?? '')}
              className={inputClass}
            />
          </div>
        )}

        {loteInfo && (
          <div className="bg-[#EDF7F1] border border-[#ACDCC2] rounded-lg px-4 py-3 space-y-0.5">
            <p className="text-xs font-semibold text-[#2F6A47] flex items-center gap-1.5">
              <span>📦</span> Lote de Venda
            </p>
            <p className="text-sm font-medium text-[#111110]">{loteInfo.nome}</p>
            <div className="flex gap-3 text-xs text-[#2F6A47] flex-wrap">
              <span>Status: {loteInfo.status === 'VENDIDO' ? 'Vendido' : loteInfo.status === 'EM_NEGOCIACAO' ? 'Em Negociação' : 'Aberto'}</span>
              {loteInfo.comprador && <span>Comprador: {loteInfo.comprador}</span>}
              {loteInfo.dataFechamento && <span>Data: {formatDateBR(loteInfo.dataFechamento)}</span>}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-[#111110] mb-1.5">Mês de Nascimento</label>
            <select {...register('eraMes')} className={selectClass}>
              <option value="">--</option>
              {['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'].map((m, i) => (
                <option key={i + 1} value={i + 1}>{m}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#111110] mb-1.5">Ano de Nascimento</label>
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
          <label className="block text-xs font-semibold text-[#111110] mb-1.5">Peso (kg)</label>
          <input {...register('peso')} type="number" step="0.1" placeholder="Ex: 350.5" className={inputClass} />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="reprodutor"
            {...register('reprodutor')}
            onChange={(e) => setValue('reprodutor', e.target.checked)}
            className="w-4 h-4 text-[#2F6A47] rounded border-[#E8E8E3] focus:ring-[#2F6A47]"
          />
          <label htmlFor="reprodutor" className="text-sm text-[#111110] cursor-pointer">
            Reprodutor (Touro)
          </label>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="descarte"
            {...register('descarte')}
            onChange={(e) => setValue('descarte', e.target.checked)}
            className="w-4 h-4 text-amber-500 rounded border-[#E8E8E3] focus:ring-amber-500"
          />
          <label htmlFor="descarte" className="text-sm text-[#111110] cursor-pointer">
            Animal de Descarte
          </label>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#111110] mb-1.5">Observações</label>
          <textarea
            {...register('observacoes')}
            rows={3}
            placeholder="Observações gerais..."
            className="w-full border border-[#E8E8E3] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2F6A47] focus:border-[#2F6A47] resize-none"
          />
        </div>

        {/* Reprodução — apenas para Fêmea */}
        {genero === 'FEMEA' && (
          <div className="space-y-3">
            {/* Histórico de registros reprodutivos */}
            {reproducoes.length > 0 && (
              <div>
                <label className="block text-xs font-semibold text-[#6B6B65] mb-2 flex items-center gap-1">
                  <HeartPulse size={12} className="text-pink-500" />
                  Registros reprodutivos anteriores
                </label>
                <div className="space-y-1">
                  {reproducoes.map((r) => {
                    const statusLabel: Record<string, string> = { CHEIA: 'Cheia (Prenha)', VAZIA: 'Vazia' };
                    return (
                      <div key={r.id} className="bg-pink-50 border border-pink-100 rounded-lg px-3 py-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-pink-800">
                            {r.statusReprodutivo ? statusLabel[r.statusReprodutivo] ?? r.statusReprodutivo : '—'}
                          </span>
                          <span className="text-pink-500">
                            {r.dataToque ? formatData(r.dataToque) : ''}
                          </span>
                        </div>
                        <div className="text-pink-600 mt-0.5 space-x-2">
                          {r.estacaoMonta && <span>{r.estacaoMonta.nome}</span>}
                          {r.statusReprodutivo === 'VAZIA' && r.nuncaPariu && <span>· Nunca pariu (primípara)</span>}
                          {r.statusReprodutivo === 'VAZIA' && r.ultimoPartoMes && r.ultimoPartoAno && <span>· Último parto: {MESES[r.ultimoPartoMes - 1]}/{r.ultimoPartoAno}</span>}
                          {r.inseminada && <span>· IA{r.semen ? `: ${r.semen.codigo}` : ''}</span>}
                          {r.dataInseminacao && <span>· {formatData(r.dataInseminacao)}</span>}
                          {r.montaNatural && <span>· Monta Natural{r.dataMontaNatural ? `: ${formatData(r.dataMontaNatural)}` : ''}</span>}
                          {r.observacoes && <span>· {r.observacoes}</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Novo registro reprodutivo */}
            <div className="bg-pink-50 border border-pink-200 rounded-lg p-4 space-y-3">
              <p className="text-xs font-semibold text-pink-700 uppercase tracking-wide flex items-center gap-1.5">
                <HeartPulse size={13} />
                {reproducoes.length > 0 ? 'Novo Registro Reprodutivo' : 'Reprodução'}
              </p>

              <div>
                <label className="block text-xs font-semibold text-[#111110] mb-1.5">Status Reprodutivo</label>
                <select value={reproStatus} onChange={(e) => { setReproStatus(e.target.value); if (e.target.value !== 'VAZIA') { setUltimoPartoMes(''); setUltimoPartoAno(''); setNuncaPariu(false); } }} className={selectClass}>
                  <option value="">Selecione...</option>
                  <option value="CHEIA">Cheia (Prenha)</option>
                  <option value="VAZIA">Vazia</option>
                </select>
              </div>

              {reproStatus === 'VAZIA' && (
                <div className="bg-white border border-pink-100 rounded-lg px-3 py-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="nuncaPariu"
                      checked={nuncaPariu}
                      onChange={(e) => { setNuncaPariu(e.target.checked); if (e.target.checked) { setUltimoPartoMes(''); setUltimoPartoAno(''); } }}
                      className="w-4 h-4 text-pink-500 rounded border-[#E8E8E3]"
                    />
                    <label htmlFor="nuncaPariu" className="text-sm text-[#111110] cursor-pointer">Nunca pariu (primípara)</label>
                  </div>
                  {!nuncaPariu && (
                    <div>
                      <label className="block text-xs font-semibold text-[#111110] mb-1.5">Último Parto (mês/ano)</label>
                      <div className="grid grid-cols-2 gap-2">
                        <select value={ultimoPartoMes} onChange={(e) => setUltimoPartoMes(e.target.value)} className={selectClass}>
                          <option value="">Mês</option>
                          {['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'].map((m, i) => (
                            <option key={i + 1} value={i + 1}>{m}</option>
                          ))}
                        </select>
                        <input
                          type="number"
                          value={ultimoPartoAno}
                          onChange={(e) => setUltimoPartoAno(e.target.value)}
                          placeholder="Ano"
                          min="2000"
                          max={new Date().getFullYear()}
                          className={inputClass}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-[#111110] mb-1.5">Data do Toque</label>
                <DatePickerBR
                  value={dataToque || null}
                  onChange={(v) => setDataToque(v ?? '')}
                  className={inputClass}
                />
                {dataToque && (
                  <p className="text-xs mt-1">
                    {estacaoDetectada
                      ? <span className="text-green-700 font-medium">Estação: {estacaoDetectada.nome}</span>
                      : <span className="text-amber-600">Nenhuma estação encontrada para esta data</span>
                    }
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <input type="checkbox" id="inseminada" checked={inseminada} onChange={(e) => { setInseminada(e.target.checked); if (e.target.checked) setMontaNatural(false); }} className="w-4 h-4 text-pink-500 rounded border-[#E8E8E3]" />
                <label htmlFor="inseminada" className="text-sm text-[#111110] cursor-pointer">Inseminação Artificial (IA)</label>
              </div>

              {inseminada && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-[#111110] mb-1.5">Data da Inseminação</label>
                    <DatePickerBR
                      value={dataInseminacao || null}
                      onChange={(v) => setDataInseminacao(v ?? '')}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#111110] mb-1.5">Sêmen Utilizado</label>
                    <select value={semenId} onChange={(e) => setSemenId(e.target.value)} className={selectClass}>
                      <option value="">Selecione...</option>
                      {semens.map((s) => <option key={s.id} value={s.id}>{s.codigo}{s.touro ? ` — ${s.touro}` : ''}</option>)}
                    </select>
                  </div>
                </>
              )}

              <div className="flex items-center gap-2">
                <input type="checkbox" id="montaNatural" checked={montaNatural} onChange={(e) => { setMontaNatural(e.target.checked); if (e.target.checked) setInseminada(false); }} className="w-4 h-4 text-[#2F6A47] rounded border-[#E8E8E3]" />
                <label htmlFor="montaNatural" className="text-sm text-[#111110] cursor-pointer">Monta Natural</label>
              </div>

              {montaNatural && (
                <div>
                  <label className="block text-xs font-semibold text-[#111110] mb-1.5">Data de Início da Monta</label>
                  <DatePickerBR
                    value={dataMontaNatural || null}
                    onChange={(v) => setDataMontaNatural(v ?? '')}
                    className={inputClass}
                  />
                  {dataMontaNatural && (
                    <p className="text-xs mt-1">
                      {estacaoMontaNatural
                        ? <span className="text-green-700 font-medium">Estação: {estacaoMontaNatural.nome}</span>
                        : <span className="text-amber-600">Nenhuma estação encontrada para esta data</span>
                      }
                    </p>
                  )}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-[#111110] mb-1.5">Observações</label>
                <textarea value={observacoesRepro} onChange={(e) => setObservacoesRepro(e.target.value)} rows={2} placeholder="Observações sobre reprodução..." className="w-full border border-[#E8E8E3] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2F6A47] focus:border-[#2F6A47] resize-none" />
              </div>
            </div>
          </div>
        )}

        {/* Vacinas existentes (somente leitura) */}
        {vacinasExistentes.length > 0 && (
          <div>
            <label className="block text-xs font-semibold text-[#6B6B65] mb-2 flex items-center gap-1">
              <Syringe size={12} />
              Vacinas já registradas
            </label>
            <div className="space-y-1">
              {vacinasExistentes.map((v) => (
                <div key={v.id} className="flex items-center justify-between bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 text-xs">
                  <span className="font-medium text-blue-800">{v.produto}</span>
                  <span className="text-blue-600">{formatData(v.data)}{v.dose ? ` · ${v.dose}` : ''}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Adicionar novas vacinas */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-semibold text-[#6B6B65]">
              {vacinasExistentes.length > 0 ? 'Adicionar mais vacinas' : 'Vacinas Aplicadas'}
            </label>
            <button
              type="button"
              onClick={addVacina}
              className="flex items-center gap-1 text-xs text-[#2F6A47] hover:text-[#255840] font-medium"
            >
              <Plus size={13} />
              Adicionar Vacina
            </button>
          </div>
          {vacinas.length === 0 && vacinasExistentes.length === 0 && (
            <p className="text-xs text-[#A8A8A2] italic">Nenhuma vacina adicionada.</p>
          )}
          {vacinas.map((v, i) => (
            <div key={i} className="bg-[#F5F4EF] border border-[#E8E8E3] rounded-lg p-3 mb-2 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#6B6B65]">Nova vacina {i + 1}</span>
                <button
                  type="button"
                  onClick={() => removeVacina(i)}
                  className="text-[#A8A8A2] hover:text-red-500 transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
              <input
                type="text"
                placeholder="Produto / Nome da vacina"
                value={v.produto}
                onChange={(e) => updateVacina(i, 'produto', e.target.value)}
                className={inputClass}
              />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-[#6B6B65] mb-1">Data de Aplicação</label>
                  <DatePickerBR
                    value={v.data || null}
                    onChange={(val) => updateVacina(i, 'data', val ?? '')}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#6B6B65] mb-1">Dose (opcional)</label>
                  <input
                    type="text"
                    placeholder="Ex: 2ml"
                    value={v.dose}
                    onChange={(e) => updateVacina(i, 'dose', e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg border border-[#E8E8E3] text-[#6B6B65] text-sm font-medium hover:bg-[#F5F4EF] transition"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 py-2.5 rounded-lg bg-[#2F6A47] hover:bg-[#255840] text-white text-sm font-semibold transition disabled:opacity-60"
          >
            {loading ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </form>
    </Drawer>
  );
}
