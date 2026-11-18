import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { StatusAnimal } from '@prisma/client';

export const dynamic = 'force-dynamic';

/**
 * Reconstrói o histórico de status a partir dos dados já existentes, para animais
 * que ainda não possuem nenhum registro de histórico. É idempotente: rodar de novo
 * não duplica nada (só processa quem está sem histórico).
 *
 * GET  → prévia (quantos animais seriam processados).
 * POST → aplica a reconstrução.
 * Somente ADMIN.
 */

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  if (session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });

  const total = await prisma.animal.count();
  const semHistorico = await prisma.animal.count({ where: { historicoStatus: { none: {} } } });

  return NextResponse.json({ total, semHistorico, jaComHistorico: total - semHistorico });
}

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  if (session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });

  const animais = await prisma.animal.findMany({
    where: { historicoStatus: { none: {} } },
    select: {
      id: true,
      status: true,
      createdAt: true,
      dataVenda: true,
      morte: { select: { dataObito: true } },
    },
  });

  const rows: { animalId: number; statusDe: StatusAnimal | null; statusPara: StatusAnimal; data: Date; observacao: string }[] = [];

  for (const a of animais) {
    // Estado inicial: entrou como Vivo na data de cadastro
    rows.push({ animalId: a.id, statusDe: null, statusPara: 'VIVO', data: a.createdAt, observacao: 'Reconstruído: cadastro' });

    if (a.morte?.dataObito) {
      rows.push({ animalId: a.id, statusDe: 'VIVO', statusPara: 'MORTO', data: a.morte.dataObito, observacao: 'Reconstruído: óbito' });
    } else if (a.status === 'MORTO') {
      rows.push({ animalId: a.id, statusDe: 'VIVO', statusPara: 'MORTO', data: a.createdAt, observacao: 'Reconstruído: óbito (sem data registrada)' });
    } else if (a.status === 'VENDIDO') {
      rows.push({ animalId: a.id, statusDe: 'VIVO', statusPara: 'VENDIDO', data: a.dataVenda ?? a.createdAt, observacao: a.dataVenda ? 'Reconstruído: venda' : 'Reconstruído: venda (sem data registrada)' });
    }
  }

  let registrosCriados = 0;
  const CHUNK = 500;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = rows.slice(i, i + CHUNK);
    const res = await prisma.historicoStatus.createMany({
      data: slice.map((r) => ({
        animalId: r.animalId,
        statusDe: r.statusDe,
        statusPara: r.statusPara,
        data: r.data,
        registradoPorId: null,
        observacao: r.observacao,
      })),
    });
    registrosCriados += res.count;
  }

  return NextResponse.json({ animaisProcessados: animais.length, registrosCriados });
}
