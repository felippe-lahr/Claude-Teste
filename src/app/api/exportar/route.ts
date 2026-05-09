import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import * as XLSX from 'xlsx';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const where: Record<string, unknown> = {};

  const status = searchParams.get('status');
  if (status) where.status = status;

  const proprietarioId = searchParams.get('proprietarioId');
  if (proprietarioId) where.proprietarioId = parseInt(proprietarioId);

  const animais = await prisma.animal.findMany({
    where,
    include: { proprietario: { select: { name: true } } },
    orderBy: [{ proprietarioId: 'asc' }, { denominacao: 'asc' }],
  });

  const rows = animais.map((a) => ({
    ID: a.id,
    Número: a.numero ?? '',
    Proprietário: a.proprietario.name,
    Gênero: a.genero,
    Denominação: a.denominacao,
    'Mês Nasc': a.eraMes ?? '',
    'Ano Nasc': a.eraAno ?? '',
    'Peso (kg)': a.peso ?? '',
    Reprodutor: a.reprodutor ? 'Sim' : 'Não',
    Status: a.status,
    Observações: a.observacoes ?? '',
    'Cadastrado em': a.createdAt.toLocaleDateString('pt-BR'),
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = Object.keys(rows[0] ?? {}).map(() => ({ wch: 18 }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Animais');

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  const hoje = new Date().toISOString().slice(0, 10);

  return new NextResponse(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="animais-${hoje}.xlsx"`,
    },
  });
}
