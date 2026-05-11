import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { classificarAnimal } from '@/lib/classificacao';
import { Genero, StatusReprodutivo } from '@prisma/client';
import * as XLSX from 'xlsx';
import { parseDateBR } from '@/lib/utils';

function parseDate(value: unknown): Date | null {
  if (!value) return null;
  // JS Date object (from cellDates:true in xlsx)
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  // Excel numeric serial
  if (typeof value === 'number') {
    const d = new Date(Math.round((value - 25569) * 86400 * 1000));
    return isNaN(d.getTime()) ? null : d;
  }
  const str = String(value).trim();
  if (!str) return null;
  // dd/mm/aaaa
  const byBR = parseDateBR(str);
  if (byBR) return byBR;
  // ISO fallback
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

function parseStr(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  if (!file) return NextResponse.json({ error: 'Arquivo não enviado' }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);

  const [usuarios, semens] = await Promise.all([
    prisma.user.findMany({ select: { id: true, name: true } }),
    prisma.semen.findMany({ select: { id: true, codigo: true } }),
  ]);

  let importados = 0;
  const erros: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;

    try {
      const nomeProprietario = parseStr(row['Proprietário'] ?? row['Proprietario']);
      const usuario = usuarios.find((u) =>
        u.name.toLowerCase().includes(nomeProprietario.toLowerCase()) ||
        nomeProprietario.toLowerCase().includes(u.name.toLowerCase().split(' ')[0].toLowerCase())
      );

      if (!usuario) {
        erros.push(`Linha ${rowNum}: Proprietário "${nomeProprietario}" não encontrado`);
        continue;
      }

      const generoStr = parseStr(row['Gênero'] ?? row['Genero']).toUpperCase();
      const genero: Genero = generoStr === 'FEMEA' || generoStr === 'FÊMEA' || generoStr === 'F' ? 'FEMEA' : 'MACHO';

      const eraMes = row['Mês Nasc'] ?? row['Mes Nasc'] ?? null;
      const eraAno = row['Ano Nasc'] ?? null;
      const reprodutor = parseStr(row['Reprodutor']).toLowerCase() === 'sim';

      const denominacao = await classificarAnimal({
        genero,
        eraMes: eraMes ? parseInt(String(eraMes)) : null,
        eraAno: eraAno ? parseInt(String(eraAno)) : null,
        reprodutor,
      });

      const statusStr = parseStr(row['Status']).toUpperCase();
      const status = (['VIVO', 'MORTO', 'VENDIDO'] as const).includes(statusStr as 'VIVO' | 'MORTO' | 'VENDIDO')
        ? (statusStr as 'VIVO' | 'MORTO' | 'VENDIDO')
        : 'VIVO';

      const dataVenda = parseDate(row['Data Venda']);

      const animal = await prisma.animal.create({
        data: {
          numero: row['Número'] || row['Numero'] ? parseStr(row['Número'] ?? row['Numero']) || null : null,
          genero,
          eraMes: eraMes ? parseInt(String(eraMes)) : null,
          eraAno: eraAno ? parseInt(String(eraAno)) : null,
          peso: row['Peso'] ? parseFloat(String(row['Peso'])) : null,
          reprodutor,
          status,
          denominacao,
          observacoes: parseStr(row['Observações'] ?? row['Observacoes']) || null,
          dataVenda: status === 'VENDIDO' && dataVenda ? dataVenda : null,
          proprietarioId: usuario.id,
        },
      });

      // Morte
      if (status === 'MORTO') {
        const causaMorte = parseStr(row['Causa da Morte']) || null;
        const dataObito = parseDate(row['Data do Óbito'] ?? row['Data Obito']);
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
        const statusReproStr = parseStr(row['Status Reprodutivo']).toUpperCase();
        const validStatusRepro: StatusReprodutivo[] = ['CHEIA', 'VAZIA', 'PARIDA', 'BEZERRO_NO_PE'];
        const statusReprodutivo = validStatusRepro.includes(statusReproStr as StatusReprodutivo)
          ? (statusReproStr as StatusReprodutivo)
          : null;

        const dataToque = parseDate(row['Data do Toque'] ?? row['Data Toque']);
        const inseminada = parseStr(row['Inseminada']).toLowerCase() === 'sim';
        const dataInseminacao = parseDate(row['Data Inseminação'] ?? row['Data Inseminacao']);
        const semenCodigo = parseStr(row['Sêmen (código)'] ?? row['Semen'] ?? row['Sêmen']);
        const semenId = semenCodigo
          ? (semens.find((s) => s.codigo.toLowerCase() === semenCodigo.toLowerCase())?.id ?? null)
          : null;
        const observacoesRepro = parseStr(row['Obs. Reprodução'] ?? row['Obs Reproducao']) || null;

        if (statusReprodutivo || dataToque) {
          // Resolve estação de monta
          let estacaoMontaId: number | null = null;
          if (dataToque) {
            const estacao = await prisma.estacaoMonta.findFirst({
              where: { ativo: true, dataInicio: { lte: dataToque }, dataFim: { gte: dataToque } },
            });
            estacaoMontaId = estacao?.id ?? null;
          }

          await prisma.reproducaoAnimal.create({
            data: {
              animalId: animal.id,
              statusReprodutivo,
              dataToque,
              estacaoMontaId,
              inseminada,
              dataInseminacao: inseminada ? dataInseminacao : null,
              semenId: inseminada ? semenId : null,
              observacoes: observacoesRepro,
              registradoPorId: parseInt(session.user.id),
            },
          });
        }
      }

      // Vacinas
      const vacinas = [];
      for (let v = 1; v <= 2; v++) {
        const produto = parseStr(row[`Vacina ${v} - Produto`]) || null;
        const dataVacStr = row[`Vacina ${v} - Data (dd/mm/aaaa)`] ?? row[`Vacina ${v} - Data`];
        const dataVac = parseDate(dataVacStr);
        const dose = parseStr(row[`Vacina ${v} - Dose`]) || null;
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

  return NextResponse.json({ importados, erros, total: rows.length });
}
