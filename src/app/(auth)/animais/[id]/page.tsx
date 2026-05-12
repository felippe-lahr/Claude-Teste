import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { AnimalDetailClient } from './animal-detail-client';

interface Props {
  params: { id: string };
}

export default async function AnimalDetailPage({ params }: Props) {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');

  const animalId = parseInt(params.id);
  if (isNaN(animalId)) notFound();

  const [animalRaw, proprietarios] = await Promise.all([
    prisma.animal.findUnique({
      where: { id: animalId },
      include: {
        proprietario: { select: { id: true, name: true } },
        morte: true,
        registrosSanitarios: { orderBy: { data: 'desc' } },
        reproducoes: {
          orderBy: { createdAt: 'desc' as const },
          include: { estacaoMonta: true, semen: true },
        },
      },
    }),
    prisma.user.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }),
  ]);

  if (!animalRaw) notFound();

  // Serialize Dates to strings for client component
  const animal = {
    ...animalRaw,
    dataVenda: animalRaw.dataVenda ? animalRaw.dataVenda.toISOString() : null,
    morte: animalRaw.morte
      ? {
          ...animalRaw.morte,
          dataObito: animalRaw.morte.dataObito.toISOString(),
        }
      : null,
    registrosSanitarios: animalRaw.registrosSanitarios.map((r) => ({
      ...r,
      data: r.data.toISOString(),
    })),
    reproducoes: animalRaw.reproducoes.map((r) => ({
      ...r,
      dataToque: r.dataToque?.toISOString() ?? null,
      dataInseminacao: r.dataInseminacao?.toISOString() ?? null,
      dataMontaNatural: r.dataMontaNatural?.toISOString() ?? null,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      estacaoMonta: r.estacaoMonta
        ? { ...r.estacaoMonta, dataInicio: r.estacaoMonta.dataInicio.toISOString(), dataFim: r.estacaoMonta.dataFim.toISOString() }
        : null,
    })),
  };

  return <AnimalDetailClient animal={animal} proprietarios={proprietarios} />;
}
