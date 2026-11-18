// Condições Prisma para "nascimento dentro de uma faixa", usando o índice ano*12+(mês-1).
// Compartilhado entre a listagem de animais e o relatório em PDF para manterem o mesmo filtro.
export function eraIndexConds(minIdx: number, maxIdx: number): Record<string, unknown>[] {
  const minYear = Math.floor(minIdx / 12);
  const minMonth = (minIdx % 12) + 1;
  const maxYear = Math.floor(maxIdx / 12);
  const maxMonth = (maxIdx % 12) + 1;
  return [
    { eraAno: { not: null } },
    { OR: [{ eraAno: { gt: minYear } }, { AND: [{ eraAno: minYear }, { OR: [{ eraMes: null }, { eraMes: { gte: minMonth } }] }] }] },
    { OR: [{ eraAno: { lt: maxYear } }, { AND: [{ eraAno: maxYear }, { OR: [{ eraMes: null }, { eraMes: { lte: maxMonth } }] }] }] },
  ];
}
