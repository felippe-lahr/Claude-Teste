import { prisma } from '@/lib/prisma';
import { StatusReprodutivo } from '@prisma/client';

/**
 * Registra automaticamente o parto na mãe a partir do nascimento de uma cria.
 * A data de nascimento da cria (mês/ano) vira o "último parto" da mãe, e a mãe
 * passa para o status reprodutivo VAZIA (acabou de parir).
 *
 * É idempotente: se o registro reprodutivo mais recente da mãe já apontar para
 * o mesmo mês/ano de parto, nada é criado.
 *
 * @returns true se um novo registro foi criado, false caso contrário.
 */
export async function registrarPartoNaMae(params: {
  maeId: number;
  criaMes: number;
  criaAno: number;
  criaNumero: string | null;
  userId: number;
}): Promise<boolean> {
  const { maeId, criaMes, criaAno, criaNumero, userId } = params;

  const mae = await prisma.animal.findUnique({
    where: { id: maeId },
    select: { id: true, genero: true },
  });
  if (!mae || mae.genero !== 'FEMEA') return false;

  const ultima = await prisma.reproducaoAnimal.findFirst({
    where: { animalId: maeId },
    orderBy: { createdAt: 'desc' },
    select: { ultimoPartoMes: true, ultimoPartoAno: true },
  });
  if (ultima && ultima.ultimoPartoMes === criaMes && ultima.ultimoPartoAno === criaAno) {
    return false;
  }

  await prisma.reproducaoAnimal.create({
    data: {
      animalId: maeId,
      statusReprodutivo: StatusReprodutivo.VAZIA,
      ultimoPartoMes: criaMes,
      ultimoPartoAno: criaAno,
      nuncaPariu: false,
      observacoes: `Parto registrado automaticamente pelo nascimento da cria${criaNumero ? ` nº ${criaNumero}` : ''}`,
      registradoPorId: userId,
    },
  });

  return true;
}
