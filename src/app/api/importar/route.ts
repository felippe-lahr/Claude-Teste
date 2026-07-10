import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
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

  const preview = rows.slice(0, 10).map((row) => ({
    id: row['ID'] ?? row['Id'] ?? null,
    numero: String(row['Número'] ?? row['Numero'] ?? ''),
    genero: String(row['Gênero'] ?? row['Genero'] ?? ''),
    eraMes: row['Mês Nasc'] ?? row['Mes Nasc'] ?? null,
    eraAno: row['Ano Nasc'] ?? null,
    peso: row['Peso'] ?? null,
    reprodutor: String(row['Reprodutor'] ?? 'Não').toLowerCase() === 'sim',
    descarte: String(row['Descarte'] ?? 'Não').toLowerCase() === 'sim',
    proprietario: String(row['Proprietário'] ?? row['Proprietario'] ?? ''),
    status: String(row['Status'] ?? 'VIVO'),
    statusReprodutivo: String(row['Status Reprodutivo'] ?? ''),
    inseminada: String(row['Inseminada'] ?? 'Não').toLowerCase() === 'sim',
    montaNatural: String(row['Monta Natural'] ?? 'Não').toLowerCase() === 'sim',
    causaMorte: String(row['Causa da Morte'] ?? ''),
    observacoes: String(row['Observações'] ?? row['Observacoes'] ?? ''),
  }));

  // Detect intra-file duplicate números
  const numLinhasMap = new Map<string, { numero: string; linhas: number[] }>();
  rows.forEach((row, i) => {
    const numero = String(row['Número'] ?? row['Numero'] ?? '').trim();
    if (!numero) return;
    const key = numero.toLowerCase();
    if (!numLinhasMap.has(key)) numLinhasMap.set(key, { numero, linhas: [] });
    numLinhasMap.get(key)!.linhas.push(i + 2); // +2: 1-based index + header row
  });

  const duplicatas = Array.from(numLinhasMap.values()).filter((d) => d.linhas.length > 1);

  return NextResponse.json({ preview, total: rows.length, duplicatas });
}
