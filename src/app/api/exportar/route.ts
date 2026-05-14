import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';

function fmtDate(d: Date | null | undefined): string {
  if (!d) return '';
  return d.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}

function fmtMonthYear(d: Date | null | undefined): string {
  if (!d) return '';
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${m}/${d.getUTCFullYear()}`;
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const where: Record<string, unknown> = {};

  const status = searchParams.get('status');
  if (status) where.status = status;

  const proprietarioId = searchParams.get('proprietarioId');
  if (proprietarioId) where.proprietarioId = parseInt(proprietarioId);

  const descarteParam = searchParams.get('descarte');
  if (descarteParam === 'true') where.descarte = true;
  else if (descarteParam === 'false') where.descarte = false;

  const animais = await prisma.animal.findMany({
    where,
    include: {
      proprietario: { select: { name: true } },
      morte: true,
      reproducoes: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        include: { semen: true, estacaoMonta: true },
      },
    },
    orderBy: [{ proprietarioId: 'asc' }, { denominacao: 'asc' }],
  });

  const rows = animais.map((a) => {
    const repro = a.reproducoes[0] ?? null;
    return {
      ID: a.id,
      Número: a.numero ?? '',
      Proprietário: a.proprietario.name,
      Gênero: a.genero,
      Denominação: a.denominacao,
      'Mês Nasc': a.eraMes ?? '',
      'Ano Nasc': a.eraAno ?? '',
      'Peso (kg)': a.peso ?? '',
      Reprodutor: a.reprodutor ? 'Sim' : 'Não',
      Descarte: a.descarte ? 'Sim' : 'Não',
      Status: a.status,
      'Data Venda': fmtDate(a.dataVenda),
      'Status Reprodutivo': repro?.statusReprodutivo ?? '',
      'Data do Toque': fmtDate(repro?.dataToque),
      'Estação de Monta': repro?.estacaoMonta?.nome ?? '',
      Inseminada: repro ? (repro.inseminada ? 'Sim' : 'Não') : '',
      'Data Inseminação': fmtDate(repro?.dataInseminacao),
      'Sêmen': repro?.semen?.codigo ?? '',
      'Monta Natural': repro ? (repro.montaNatural ? 'Sim' : 'Não') : '',
      'Data Monta Natural': fmtDate(repro?.dataMontaNatural),
      'Nunca Pariu': repro?.statusReprodutivo === 'VAZIA' ? (repro.nuncaPariu ? 'Sim' : 'Não') : '',
      'Último Parto': repro?.statusReprodutivo === 'VAZIA' && !repro.nuncaPariu && repro.ultimoPartoMes && repro.ultimoPartoAno
        ? `${String(repro.ultimoPartoMes).padStart(2, '0')}/${repro.ultimoPartoAno}`
        : '',
      'Obs. Reprodução': repro?.observacoes ?? '',
      'Causa Morte': a.morte?.causa ?? '',
      'Data Óbito (mm/aaaa)': fmtMonthYear(a.morte?.dataObito),
      Observações: a.observacoes ?? '',
      'Cadastrado em': fmtDate(a.createdAt),
    };
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = Object.keys(rows[0] ?? {}).map(() => ({ wch: 18 }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Animais');

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  const hoje = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');

  return new NextResponse(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="animais-${hoje}.xlsx"`,
    },
  });
}
