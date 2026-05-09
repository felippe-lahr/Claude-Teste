import { Genero } from '@prisma/client';
import { prisma } from './prisma';

export async function classificarAnimal(params: {
  genero: Genero;
  eraMes: number | null;
  eraAno: number | null;
  reprodutor: boolean;
}): Promise<string> {
  const { genero, eraMes, eraAno, reprodutor } = params;

  if (genero === Genero.MACHO && reprodutor) return 'Touro';

  if (eraAno == null) {
    return genero === Genero.MACHO ? 'Bezerro Macho' : 'Bezerra Fêmea';
  }

  const hoje = new Date();
  const nascimento = new Date(eraAno, (eraMes ?? 1) - 1, 1);
  const meses =
    (hoje.getFullYear() - nascimento.getFullYear()) * 12 +
    (hoje.getMonth() - nascimento.getMonth());

  const regras = await prisma.classificacaoConfig.findMany({
    where: { genero },
    orderBy: { ordem: 'asc' },
  });

  for (const r of regras) {
    const dentroMin = meses >= r.idadeMinMeses;
    const dentroMax = r.idadeMaxMeses == null || meses <= r.idadeMaxMeses;
    if (dentroMin && dentroMax) return r.denominacao;
  }

  return genero === Genero.MACHO ? 'Boi' : 'Vaca';
}
