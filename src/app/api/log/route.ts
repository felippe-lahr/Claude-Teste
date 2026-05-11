import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const page = parseInt(searchParams.get('page') ?? '1');
  const limit = parseInt(searchParams.get('limit') ?? '50');
  const skip = (page - 1) * limit;
  const tipo = searchParams.get('tipo');
  const dataInicio = searchParams.get('dataInicio');
  const dataFim = searchParams.get('dataFim');
  const formato = searchParams.get('formato'); // 'csv' for download

  const where: Record<string, unknown> = {};
  if (tipo) where.tipo = tipo;
  if (dataInicio || dataFim) {
    where.createdAt = {
      ...(dataInicio ? { gte: new Date(dataInicio) } : {}),
      ...(dataFim ? { lte: new Date(dataFim + 'T23:59:59Z') } : {}),
    };
  }

  if (formato === 'csv') {
    const logs = await prisma.logAlteracao.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 5000,
    });

    const header = 'Data/Hora,Tipo,Nº Animal,Proprietário,Descrição,Usuário,Origem,Arquivo,Hash SHA-256,Total Importado,Erros\n';
    const rows = logs.map((l) => {
      const cols = [
        new Date(l.createdAt).toLocaleString('pt-BR'),
        l.tipo,
        l.animalNumero ?? '',
        l.proprietario ?? '',
        l.descricao.replace(/,/g, ';'),
        l.userName,
        l.origem ?? '',
        l.fileName ?? '',
        l.fileHash ?? '',
        l.importTotal ?? '',
        l.importErros ?? '',
      ];
      return cols.map((c) => `"${c}"`).join(',');
    });

    const csv = header + rows.join('\n');
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="log-alteracoes-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  }

  const [logs, total] = await Promise.all([
    prisma.logAlteracao.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.logAlteracao.count({ where }),
  ]);

  return NextResponse.json({ logs, total, page, limit, pages: Math.ceil(total / limit) });
}
