import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { classificarAnimal } from '@/lib/classificacao';
import { Genero, StatusReprodutivo } from '@prisma/client';
import * as XLSX from 'xlsx';
import { createHash } from 'crypto';
import { parseDateBR } from '@/lib/utils';
import { registrarLog } from '@/lib/log';

function parseDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  if (typeof value === 'number') {
    const d = new Date(Math.round((value - 25569) * 86400 * 1000));
    return isNaN(d.getTime()) ? null : d;
  }
  const str = String(value).trim();
  if (!str) return null;
  const byBR = parseDateBR(str);
  if (byBR) return byBR;
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

function parseStr(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

// Read a column by its exact header, then by a fallback without the "(dd/mm/aaaa)" suffix
function col(row: Record<string, unknown>, ...keys: string[]): unknown {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null && row[key] !== '') return row[key];
  }
  return null;
}

// Strict proprietário matching: exact first, then full-string contains — avoids first-name collisions
function findProprietario(usuarios: { id: number; name: string }[], nome: string) {
  const n = nome.toLowerCase().trim();
  // 1. Exact (case-insensitive)
  const exact = usuarios.find((u) => u.name.toLowerCase().trim() === n);
  if (exact) return exact;
  // 2. User name fully contained in input OR input fully contained in user name
  return usuarios.find((u) => {
    const u2 = u.name.toLowerCase().trim();
    return u2.includes(n) || n.includes(u2);
  }) ?? null;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  if (!file) return NextResponse.json({ error: 'Arquivo não enviado' }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const fileHash = createHash('sha256').update(buffer).digest('hex');

  // Block re-upload of an identical file
  const logDuplicado = await prisma.logAlteracao.findFirst({ where: { fileHash, tipo: 'IMPORTACAO' } });
  if (logDuplicado) {
    return NextResponse.json({
      error: `Este arquivo já foi importado em ${new Date(logDuplicado.createdAt).toLocaleString('pt-BR')} por ${logDuplicado.userName}. Importe um arquivo diferente.`,
    }, { status: 409 });
  }

  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);

  const [usuarios, semens, numerosExistentes] = await Promise.all([
    prisma.user.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }),
    prisma.semen.findMany({ select: { id: true, codigo: true, touro: true } }),
    prisma.animal.findMany({ where: { numero: { not: null } }, select: { numero: true } }),
  ]);
  const numerosSet = new Set(numerosExistentes.map((a) => a.numero!.toLowerCase().trim()));

  let importados = 0;
  const erros: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;

    try {
      const nomeProprietario = parseStr(col(row, 'Proprietário', 'Proprietario'));
      const usuario = findProprietario(usuarios, nomeProprietario);

      if (!usuario) {
        erros.push(`Linha ${rowNum}: Proprietário "${nomeProprietario}" não encontrado`);
        continue;
      }

      const numeroRaw = parseStr(col(row, 'Número', 'Numero'));
      if (numeroRaw) {
        const numeroKey = numeroRaw.toLowerCase().trim();
        if (numerosSet.has(numeroKey)) {
          erros.push(`Linha ${rowNum}: Animal nº "${numeroRaw}" já existe no sistema`);
          continue;
        }
        numerosSet.add(numeroKey); // prevent duplicate within same file
      }

      const generoStr = parseStr(col(row, 'Gênero', 'Genero')).toUpperCase();
      const genero: Genero = generoStr === 'FEMEA' || generoStr === 'FÊMEA' || generoStr === 'F' ? 'FEMEA' : 'MACHO';

      const eraMes = col(row, 'Mês Nasc', 'Mes Nasc');
      const eraAno = col(row, 'Ano Nasc');
      const reprodutor = parseStr(col(row, 'Reprodutor')).toLowerCase() === 'sim';
      const descarte = parseStr(col(row, 'Descarte')).toLowerCase() === 'sim';

      const denominacao = await classificarAnimal({
        genero,
        eraMes: eraMes ? parseInt(String(eraMes)) : null,
        eraAno: eraAno ? parseInt(String(eraAno)) : null,
        reprodutor,
      });

      const statusStr = parseStr(col(row, 'Status')).toUpperCase();
      const status = (['VIVO', 'MORTO', 'VENDIDO'] as const).includes(statusStr as 'VIVO' | 'MORTO' | 'VENDIDO')
        ? (statusStr as 'VIVO' | 'MORTO' | 'VENDIDO')
        : 'VIVO';

      const dataVenda = parseDate(col(row, 'Data Venda (dd/mm/aaaa)', 'Data Venda'));

      const animal = await prisma.animal.create({
        data: {
          numero: parseStr(col(row, 'Número', 'Numero')) || null,
          genero,
          eraMes: eraMes ? parseInt(String(eraMes)) : null,
          eraAno: eraAno ? parseInt(String(eraAno)) : null,
          peso: col(row, 'Peso (kg)', 'Peso') ? parseFloat(String(col(row, 'Peso (kg)', 'Peso'))) : null,
          reprodutor,
          descarte,
          status,
          denominacao,
          observacoes: parseStr(col(row, 'Observações', 'Observacoes')) || null,
          dataVenda: status === 'VENDIDO' && dataVenda ? dataVenda : null,
          proprietarioId: usuario.id,
        },
      });

      // Morte
      if (status === 'MORTO') {
        const causaMorte = parseStr(col(row, 'Causa da Morte')) || null;
        const dataObito = parseDate(col(row, 'Data do Óbito (dd/mm/aaaa)', 'Data do Obito (dd/mm/aaaa)', 'Data do Óbito', 'Data Obito'));
        if (dataObito) {
          await prisma.morte.create({
            data: {
              animalId: animal.id,
              causa: causaMorte,
              dataObito,
              registradoPorId: parseInt(session.user.id),
            },
          });
        }
      }

      // Reprodução (apenas fêmeas)
      if (genero === 'FEMEA') {
        const statusReproStr = parseStr(col(row, 'Status Reprodutivo')).toUpperCase();
        const validStatusRepro: StatusReprodutivo[] = ['CHEIA', 'VAZIA', 'PARIDA', 'BEZERRO_NO_PE'];
        const statusReprodutivo = validStatusRepro.includes(statusReproStr as StatusReprodutivo)
          ? (statusReproStr as StatusReprodutivo)
          : null;

        const dataToque = parseDate(col(row, 'Data do Toque (dd/mm/aaaa)', 'Data do Toque', 'Data Toque'));
        const dataInseminacao = parseDate(col(row, 'Data Inseminação (dd/mm/aaaa)', 'Data Inseminacao (dd/mm/aaaa)', 'Data Inseminação', 'Data Inseminacao'));
        const semenCodigo = parseStr(col(row, 'Sêmen (código)', 'Semen (codigo)', 'Sêmen', 'Semen'));
        const semenId = semenCodigo
          ? (semens.find((s) => s.codigo.toLowerCase() === semenCodigo.toLowerCase())?.id
              ?? semens.find((s) => s.touro?.toLowerCase() === semenCodigo.toLowerCase())?.id
              ?? null)
          : null;
        // Infer inseminada=true when insemination date or semen is present even if cell blank
        const inseminadaCell = parseStr(col(row, 'Inseminada')).toLowerCase();
        const inseminada = inseminadaCell === 'sim' || (!inseminadaCell && (!!dataInseminacao || !!semenId));
        const montaNaturalCell = parseStr(col(row, 'Monta Natural')).toLowerCase();
        const montaNatural = montaNaturalCell === 'sim';
        const dataMontaNatural = montaNatural ? parseDate(col(row, 'Data Monta Natural (dd/mm/aaaa)', 'Data Monta Natural')) : null;
        const observacoesRepro = parseStr(col(row, 'Obs. Reprodução', 'Obs Reproducao')) || null;

        if (statusReprodutivo || dataToque || montaNatural) {
          // Resolve estação from dataToque, dataInseminacao or dataMontaNatural
          let estacaoMontaId: number | null = null;
          for (const candidateDate of [dataToque, dataInseminacao, dataMontaNatural]) {
            if (!candidateDate) continue;
            const estacao = await prisma.estacaoMonta.findFirst({
              where: { ativo: true, dataInicio: { lte: candidateDate }, dataFim: { gte: candidateDate } },
            });
            if (estacao) { estacaoMontaId = estacao.id; break; }
          }

          await prisma.reproducaoAnimal.create({
            data: {
              animalId: animal.id,
              statusReprodutivo,
              dataToque,
              estacaoMontaId,
              inseminada: inseminada && !montaNatural,
              dataInseminacao: inseminada && !montaNatural ? dataInseminacao : null,
              semenId: inseminada && !montaNatural ? semenId : null,
              montaNatural,
              dataMontaNatural,
              observacoes: observacoesRepro,
              registradoPorId: parseInt(session.user.id),
            },
          });
        }
      }

      // Vacinas
      const vacinas = [];
      for (let v = 1; v <= 2; v++) {
        const produto = parseStr(col(row, `Vacina ${v} - Produto`)) || null;
        const dataVac = parseDate(col(row, `Vacina ${v} - Data (dd/mm/aaaa)`, `Vacina ${v} - Data`));
        const dose = parseStr(col(row, `Vacina ${v} - Dose`)) || null;
        if (produto && dataVac) {
          vacinas.push({ animalId: animal.id, tipo: 'VACINA' as const, produto, data: dataVac, dose });
        }
      }
      if (vacinas.length > 0) {
        await prisma.registroSanitario.createMany({ data: vacinas });
      }

      importados++;
    } catch (e) {
      erros.push(`Linha ${rowNum}: ${e instanceof Error ? e.message : 'Erro desconhecido'}`);
    }
  }

  await registrarLog({
    tipo: 'IMPORTACAO',
    descricao: `${importados} animal(is) importado(s), ${erros.length} erro(s)`,
    userId: parseInt(session.user.id),
    userName: session.user.name ?? session.user.email ?? 'Usuário',
    origem: `Importação: ${file.name}`,
    fileHash,
    fileName: file.name,
    importTotal: rows.length,
    importErros: erros.length,
  });

  return NextResponse.json({ importados, erros, total: rows.length });
}
