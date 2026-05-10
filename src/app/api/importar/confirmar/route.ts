import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { classificarAnimal } from '@/lib/classificacao';
import { Genero } from '@prisma/client';
import * as XLSX from 'xlsx';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  if (!file) return NextResponse.json({ error: 'Arquivo não enviado' }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);

  const usuarios = await prisma.user.findMany({ select: { id: true, name: true } });

  let importados = 0;
  const erros: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;

    try {
      const nomeProprietario = String(row['Proprietário'] ?? row['Proprietario'] ?? '').trim();
      const usuario = usuarios.find((u) =>
        u.name.toLowerCase().includes(nomeProprietario.toLowerCase()) ||
        nomeProprietario.toLowerCase().includes(u.name.toLowerCase().split(' ')[0].toLowerCase())
      );

      if (!usuario) {
        erros.push(`Linha ${rowNum}: Proprietário "${nomeProprietario}" não encontrado`);
        continue;
      }

      const generoStr = String(row['Gênero'] ?? row['Genero'] ?? '').toUpperCase();
      const genero: Genero = generoStr === 'FEMEA' || generoStr === 'FÊMEA' || generoStr === 'F' ? 'FEMEA' : 'MACHO';

      const eraMes = row['Mês Nasc'] ?? row['Mes Nasc'] ?? null;
      const eraAno = row['Ano Nasc'] ?? null;
      const reprodutor = String(row['Reprodutor'] ?? 'Não').toLowerCase() === 'sim';

      const denominacao = await classificarAnimal({
        genero,
        eraMes: eraMes ? parseInt(String(eraMes)) : null,
        eraAno: eraAno ? parseInt(String(eraAno)) : null,
        reprodutor,
      });

      const statusStr = String(row['Status'] ?? 'VIVO').toUpperCase();
      const status = (['VIVO', 'MORTO', 'VENDIDO'] as const).includes(statusStr as 'VIVO' | 'MORTO' | 'VENDIDO')
        ? (statusStr as 'VIVO' | 'MORTO' | 'VENDIDO')
        : 'VIVO';

      const dataVendaStr = row['Data Venda'] ? String(row['Data Venda']) : null;
      const dataVenda = dataVendaStr ? new Date(dataVendaStr) : null;

      const animal = await prisma.animal.create({
        data: {
          numero: row['Número'] || row['Numero'] ? String(row['Número'] ?? row['Numero']) : null,
          genero,
          eraMes: eraMes ? parseInt(String(eraMes)) : null,
          eraAno: eraAno ? parseInt(String(eraAno)) : null,
          peso: row['Peso'] ? parseFloat(String(row['Peso'])) : null,
          reprodutor,
          status,
          denominacao,
          observacoes: row['Observações'] || row['Observacoes'] ? String(row['Observações'] ?? row['Observacoes']) : null,
          dataVenda: status === 'VENDIDO' && dataVenda ? dataVenda : null,
          proprietarioId: usuario.id,
        },
      });

      const vacinas = [];
      for (let v = 1; v <= 2; v++) {
        const produto = row[`Vacina ${v} - Produto`] ? String(row[`Vacina ${v} - Produto`]).trim() : null;
        const dataVac = row[`Vacina ${v} - Data`] ? String(row[`Vacina ${v} - Data`]).trim() : null;
        const dose = row[`Vacina ${v} - Dose`] ? String(row[`Vacina ${v} - Dose`]).trim() : null;
        if (produto && dataVac) {
          vacinas.push({ animalId: animal.id, tipo: 'VACINA' as const, produto, data: new Date(dataVac), dose: dose || null });
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
