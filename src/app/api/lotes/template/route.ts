import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const preencherAnimais = searchParams.get('animais') === 'true';

  let rows: Record<string, string | number>[] = [];

  if (preencherAnimais) {
    const animais = await prisma.animal.findMany({
      where: { status: 'VIVO', descarte: false },
      select: { id: true, numero: true, denominacao: true, genero: true, peso: true, proprietario: { select: { name: true } } },
      orderBy: [{ proprietario: { name: 'asc' } }, { numero: 'asc' }],
    });

    rows = animais.map((a) => ({
      ID: a.id,
      Número: a.numero ?? '',
      Denominação: a.denominacao ?? '',
      Gênero: a.genero === 'MACHO' ? 'Macho' : 'Fêmea',
      'Peso Atual (kg)': a.peso ?? '',
      'Valor (R$)': '',
      Proprietário: a.proprietario?.name ?? '',
    }));
  } else {
    rows = [
      { ID: 101, 'Peso Atual (kg)': 450, 'Valor (R$)': 3200 },
      { ID: 102, 'Peso Atual (kg)': 380, 'Valor (R$)': 2800 },
      { ID: 103, 'Peso Atual (kg)': '', 'Valor (R$)': '' },
    ];
  }

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);

  ws['!cols'] = preencherAnimais
    ? [{ wch: 8 }, { wch: 12 }, { wch: 20 }, { wch: 10 }, { wch: 16 }, { wch: 14 }, { wch: 20 }]
    : [{ wch: 8 }, { wch: 16 }, { wch: 14 }];

  XLSX.utils.book_append_sheet(wb, ws, 'Lote');

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  const filename = preencherAnimais ? 'animais-para-lote.xlsx' : 'template-lote.xlsx';

  return new NextResponse(buf, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
