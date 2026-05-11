import { prisma } from './prisma';

export type LogTipo = 'IMPORTACAO' | 'CADASTRO' | 'EDICAO' | 'EXCLUSAO' | 'REPRODUCAO' | 'SANITARIO' | 'LOTE';

interface LogParams {
  tipo: LogTipo;
  descricao: string;
  userId: number;
  userName: string;
  animalId?: number | null;
  animalNumero?: string | null;
  proprietario?: string | null;
  origem?: string;
  fileHash?: string | null;
  fileName?: string | null;
  importTotal?: number;
  importErros?: number;
}

export async function registrarLog(params: LogParams) {
  await prisma.logAlteracao.create({
    data: {
      tipo: params.tipo,
      descricao: params.descricao,
      userId: params.userId,
      userName: params.userName,
      animalId: params.animalId ?? null,
      animalNumero: params.animalNumero ?? null,
      proprietario: params.proprietario ?? null,
      origem: params.origem ?? 'Manual',
      fileHash: params.fileHash ?? null,
      fileName: params.fileName ?? null,
      importTotal: params.importTotal ?? null,
      importErros: params.importErros ?? null,
    },
  });
}

export async function registrarLogLote(
  ids: number[],
  descricaoFn: (id: number) => string,
  base: Omit<LogParams, 'animalId' | 'descricao'>,
  animais: { id: number; numero: string | null; proprietario: { name: string } }[],
) {
  const data = ids.map((id) => {
    const a = animais.find((x) => x.id === id);
    return {
      tipo: base.tipo,
      descricao: descricaoFn(id),
      userId: base.userId,
      userName: base.userName,
      animalId: id,
      animalNumero: a?.numero ?? null,
      proprietario: a?.proprietario.name ?? null,
      origem: base.origem ?? 'Lote',
      fileHash: null,
      fileName: null,
      importTotal: null,
      importErros: null,
    };
  });
  await prisma.logAlteracao.createMany({ data });
}
