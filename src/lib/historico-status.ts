import { prisma } from '@/lib/prisma';
import { StatusAnimal } from '@prisma/client';

/**
 * Registra uma mudança de status do animal (Vivo / Morto / Vendido) no histórico.
 * O histórico é append-only: cada chamada adiciona uma linha com a data em que a
 * mudança ocorreu, preservando toda a linha do tempo do animal.
 *
 * `statusDe` nulo representa o estado inicial (entrada do animal no sistema).
 */
export async function registrarMudancaStatus(params: {
  animalId: number;
  statusDe: StatusAnimal | null;
  statusPara: StatusAnimal;
  data: Date;
  userId: number | null;
  observacao?: string | null;
}): Promise<void> {
  await prisma.historicoStatus.create({
    data: {
      animalId: params.animalId,
      statusDe: params.statusDe ?? null,
      statusPara: params.statusPara,
      data: params.data,
      registradoPorId: params.userId ?? null,
      observacao: params.observacao ?? null,
    },
  });
}
