import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { registrarLog } from '@/lib/log';
import { StatusLote } from '@prisma/client';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const lote = await prisma.loteAnimal.findUnique({
    where: { id: parseInt(params.id) },
    include: {
      criadoPor: { select: { name: true } },
      animais: {
        include: {
          animal: {
            select: {
              id: true, numero: true, denominacao: true, genero: true, peso: true,
              status: true, descarte: true,
              proprietario: { select: { id: true, name: true } },
            },
          },
        },
      },
    },
  });

  if (!lote) return NextResponse.json({ error: 'Lote não encontrado' }, { status: 404 });
  return NextResponse.json(lote);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const body = await req.json();
  const { nome, status, dataFechamento, comprador, valorTotal, pesoTotal, notaFiscal, gta, observacoes } = body;

  const loteAtual = await prisma.loteAnimal.findUnique({
    where: { id: parseInt(params.id) },
    include: { animais: { select: { animalId: true } } },
  });
  if (!loteAtual) return NextResponse.json({ error: 'Lote não encontrado' }, { status: 404 });

  const novoStatus = status as StatusLote | undefined;

  // When marking VENDIDO: update all animals
  if (novoStatus === 'VENDIDO' && loteAtual.status !== 'VENDIDO') {
    const animalIds = loteAtual.animais.map((a) => a.animalId);
    const dataVenda = dataFechamento ? new Date(dataFechamento) : new Date();
    await prisma.animal.updateMany({
      where: { id: { in: animalIds } },
      data: { status: 'VENDIDO', dataVenda },
    });

    const animaisInfo = await prisma.animal.findMany({
      where: { id: { in: animalIds } },
      select: { id: true, numero: true, proprietario: { select: { name: true } } },
    });
    await prisma.logAlteracao.createMany({
      data: animaisInfo.map((a) => ({
        tipo: 'LOTE',
        descricao: `Vendido via lote "${loteAtual.nome}"${comprador ? ` para ${comprador}` : ''}`,
        userId: parseInt(session.user.id),
        userName: session.user.name ?? session.user.email ?? 'Usuário',
        animalId: a.id,
        animalNumero: a.numero,
        proprietario: a.proprietario.name,
        origem: `Lote: ${loteAtual.nome}`,
      })),
    });
  }

  const lote = await prisma.loteAnimal.update({
    where: { id: parseInt(params.id) },
    data: {
      nome: nome ?? loteAtual.nome,
      status: novoStatus ?? loteAtual.status,
      dataFechamento: dataFechamento ? new Date(dataFechamento) : loteAtual.dataFechamento,
      comprador: comprador !== undefined ? (comprador || null) : loteAtual.comprador,
      valorTotal: valorTotal !== undefined ? (valorTotal ? parseFloat(valorTotal) : null) : loteAtual.valorTotal,
      pesoTotal: pesoTotal !== undefined ? (pesoTotal ? parseFloat(pesoTotal) : null) : loteAtual.pesoTotal,
      notaFiscal: notaFiscal !== undefined ? (notaFiscal || null) : loteAtual.notaFiscal,
      gta: gta !== undefined ? (gta || null) : loteAtual.gta,
      observacoes: observacoes !== undefined ? (observacoes || null) : loteAtual.observacoes,
    },
    include: {
      criadoPor: { select: { name: true } },
      animais: { include: { animal: { select: { id: true, numero: true, denominacao: true, genero: true, peso: true, status: true, proprietario: { select: { name: true } } } } } },
    },
  });

  await registrarLog({
    tipo: 'LOTE',
    descricao: `Lote "${lote.nome}" atualizado: status ${loteAtual.status} → ${lote.status}`,
    userId: parseInt(session.user.id),
    userName: session.user.name ?? session.user.email ?? 'Usuário',
    origem: `Lote: ${lote.nome}`,
  });

  return NextResponse.json(lote);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const lote = await prisma.loteAnimal.findUnique({ where: { id: parseInt(params.id) } });
  if (!lote) return NextResponse.json({ error: 'Lote não encontrado' }, { status: 404 });
  if (lote.status === 'VENDIDO') {
    return NextResponse.json({ error: 'Lotes vendidos não podem ser excluídos' }, { status: 400 });
  }

  await prisma.loteAnimal.delete({ where: { id: parseInt(params.id) } });

  await registrarLog({
    tipo: 'EXCLUSAO',
    descricao: `Lote excluído: "${lote.nome}"`,
    userId: parseInt(session.user.id),
    userName: session.user.name ?? session.user.email ?? 'Usuário',
    origem: 'Lote',
  });

  return NextResponse.json({ success: true });
}
