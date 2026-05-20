// Pregnancy stage calculation helper — used in both client and API

export const STAGE_START: Record<string, number> = { P1: 0, P2: 3, P3: 6 };

export interface PrenhezConfig {
  estagio: string;
  mesInicio: number;
  mesFim: number;
  ordem: number;
}

export const DEFAULT_PRENHEZ_CONFIGS: PrenhezConfig[] = [
  { estagio: 'P1', mesInicio: 0, mesFim: 2, ordem: 0 },
  { estagio: 'P2', mesInicio: 3, mesFim: 5, ordem: 1 },
  { estagio: 'P3', mesInicio: 6, mesFim: 8, ordem: 2 },
];

export function calcularEstagioAtual(
  estagio: string,
  dataToque: Date,
  configs: PrenhezConfig[],
): 'P1' | 'P2' | 'P3' {
  const mesesNaToque = STAGE_START[estagio] ?? 0;
  const mesesPassados = Math.max(
    0,
    Math.floor((Date.now() - dataToque.getTime()) / (1000 * 60 * 60 * 24 * 30.44)),
  );
  const totalMeses = mesesNaToque + mesesPassados;
  const sorted = [...configs].sort((a, b) => a.ordem - b.ordem);
  for (const c of sorted) {
    if (totalMeses <= c.mesFim) return c.estagio as 'P1' | 'P2' | 'P3';
  }
  return 'P3';
}

/** Calculate expected birth month given stage at toque + dataToque */
export function calcularMesParto(
  estagio: string,
  dataToque: Date,
): { mes: number; ano: number } {
  const mesesNaToque = STAGE_START[estagio] ?? 0;
  const mesesRestantes = 9 - mesesNaToque;
  const dtParto = new Date(dataToque.getTime());
  dtParto.setUTCMonth(dtParto.getUTCMonth() + mesesRestantes);
  return { mes: dtParto.getUTCMonth() + 1, ano: dtParto.getUTCFullYear() };
}
