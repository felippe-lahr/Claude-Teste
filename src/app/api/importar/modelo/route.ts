import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import * as XLSX from 'xlsx';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const headers = [
    'Número', 'Gênero', 'Mês Nasc', 'Ano Nasc', 'Peso', 'Reprodutor', 'Proprietário', 'Observações',
    'Status', 'Data Venda',
    'Vacina 1 - Produto', 'Vacina 1 - Data', 'Vacina 1 - Dose',
    'Vacina 2 - Produto', 'Vacina 2 - Data', 'Vacina 2 - Dose',
  ];
  const exampleRow = ['001', 'MACHO', '3', '2022', '350', 'Não', 'Luiz Henrique', '', 'VIVO', '', 'Aftosa', '2024-01-15', '2ml', '', '', ''];
  const exampleRow2 = ['002', 'FEMEA', '6', '2021', '280', 'Não', 'Leda', '', 'VENDIDO', '2024-06-01', '', '', '', '', '', ''];

  const ws = XLSX.utils.aoa_to_sheet([headers, exampleRow, exampleRow2]);

  // Set column widths
  ws['!cols'] = headers.map(() => ({ wch: 18 }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Animais');

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  return new NextResponse(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="modelo-importacao.xlsx"',
    },
  });
}
