import { Genero } from '@prisma/client';
import { prisma } from './prisma';

type Regra = { genero: Genero; idadeMinMeses: number; idadeMaxMeses: number | null; denominacao: string };

export function calcularDenominacao(
  genero: Genero,
  eraMes: number | null,
  eraAno: number | null,
  reprodutor: boolean,
  regras: Regra[],
): string {
  if (genero === Genero.MACHO && reprodutor) return 'Touro';

  if (eraAno == null) {
    return genero === Genero.MACHO ? 'Boi' : 'Vaca';
  }

  const hoje = new Date();
  const nascimento = new Date(eraAno, (eraMes ?? 1) - 1, 1);
  const meses =
    (hoje.getFullYear() - nascimento.getFullYear()) * 12 +
    (hoje.getMonth() - nascimento.getMonth());

  const regrasFiltradas = regras.filter((r) => r.genero === genero);
  for (const r of regrasFiltradas) {
    const dentroMin = meses >= r.idadeMinMeses;
    const dentroMax = r.idadeMaxMeses == null || meses <= r.idadeMaxMeses;
    if (dentroMin && dentroMax) return r.denominacao;
  }

  return genero === Genero.MACHO ? 'Boi' : 'Vaca';
}

export async function classificarAnimal(params: {
  genero: Genero;
  eraMes: number | null;
  eraAno: number | null;
  reprodutor: boolean;
}): Promise<string> {
  const regras = await prisma.classificacaoConfig.findMany({ orderBy: { ordem: 'asc' } });
  return calcularDenominacao(params.genero, params.eraMes, params.eraAno, params.reprodutor, regras);
}
