import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { registrarLog } from '@/lib/log';
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  const preview = formData.get('preview') === 'true';

  if (!file) return NextResponse.json({ error: 'Arquivo não enviado' }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);

  const items = rows.map((row, i) => {
    const idRaw = row['ID'] ?? row['Id'];
    const id = idRaw ? parseInt(String(idRaw)) : null;
    const pesoRaw = row['Peso Atual (kg)'] ?? row['Peso Atual'] ?? row['Peso'] ?? null;
    const pesoAtual = pesoRaw ? parseFloat(String(pesoRaw)) : null;
    const valorRaw = row['Valor (R$)'] ?? row['Valor'] ?? null;
    const valorUnit = valorRaw ? parseFloat(String(valorRaw)) : null;
    return { linha: i + 2, id, pesoAtual, valorUnit };
  });

  if (preview) {
    return NextResponse.json({ preview: items.slice(0, 10), total: items.length });
  }

  const nomeLote = String(formData.get('nome') ?? '').trim();
  const comprador = String(formData.get('comprador') ?? '').trim() || null;
  const dataFechamentoRaw = formData.get('dataFechamento') as string | null;
  const dataFechamento = dataFechamentoRaw ? new Date(dataFechamentoRaw) : null;
  const notaFiscal = String(formData.get('notaFiscal') ?? '').trim() || null;
  const gta = String(formData.get('gta') ?? '').trim() || null;
  const observacoes = String(formData.get('observacoes') ?? '').trim() || null;
  const atualizarPeso = formData.get('atualizarPeso') === 'true';

  if (!nomeLote) return NextResponse.json({ error: 'Nome do lote é obrigatório' }, { status: 400 });

  const validIds = items.map((r) => r.id).filter((id): id is number => id !== null && !isNaN(id) && id > 0);
  if (validIds.length === 0) return NextResponse.json({ error: 'Nenhum ID válido encontrado na planilha' }, { status: 400 });

  const animaisExistentes = await prisma.animal.findMany({
    where: { id: { in: validIds } },
    select: { id: true, numero: true },
  });
  const existentesSet = new Set(animaisExistentes.map((a) => a.id));
  const naoEncontrados = validIds.filter((id) => !existentesSet.has(id));

  if (naoEncontrados.length > 0) {
    return NextResponse.json({ error: `IDs não encontrados: ${naoEncontrados.join(', ')}` }, { status: 400 });
  }

  const conflito = await prisma.loteAnimalItem.findFirst({
    where: { animalId: { in: validIds }, lote: { status: { in: ['ABERTO', 'EM_NEGOCIACAO'] } } },
    include: { animal: { select: { numero: true } }, lote: { select: { nome: true } } },
  });
  if (conflito) {
    return NextResponse.json({
      error: `Animal ${conflito.animal.numero ?? conflito.animalId} já está no lote "${conflito.lote.nome}"`,
    }, { status: 409 });
  }

  const itemMap = new Map(items.filter((r) => r.id).map((r) => [r.id!, r]));
  const pesoTotal = items.reduce((s, r) => s + (r.pesoAtual ?? 0), 0) || null;
  const valorTotal = items.reduce((s, r) => s + (r.valorUnit ?? 0), 0) || null;

  const lote = await prisma.loteAnimal.create({
    data: {
      nome: nomeLote,
      comprador,
      dataFechamento,
      notaFiscal,
      gta,
      observacoes,
      pesoTotal,
      valorTotal,
      criadoPorId: parseInt(session.user.id),
      animais: {
        create: validIds.map((id) => ({
          animalId: id,
          pesoAtual: itemMap.get(id)?.pesoAtual ?? null,
          valorUnit: itemMap.get(id)?.valorUnit ?? null,
        })),
      },
    },
  });

  if (atualizarPeso) {
    for (const item of items) {
      if (item.id && item.pesoAtual !== null && existentesSet.has(item.id)) {
        await prisma.animal.update({ where: { id: item.id }, data: { peso: item.pesoAtual } });
      }
    }
  }

  await registrarLog({
    tipo: 'LOTE',
    descricao: `Lote importado: "${nomeLote}" com ${validIds.length} animal(is) via planilha`,
    userId: parseInt(session.user.id),
    userName: session.user.name ?? session.user.email ?? 'Usuário',
    origem: `Importação: ${file.name}`,
  });

  return NextResponse.json({ loteId: lote.id, total: validIds.length, pesoTotal, valorTotal }, { status: 201 });
}
