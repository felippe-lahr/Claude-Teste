import { PrismaClient, Genero } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const senhaPadrao = await bcrypt.hash('mudar123', 10);

  await prisma.user.upsert({
    where: { email: 'luiz.henrique@fazenda.com.br' },
    update: {},
    create: {
      name: 'Luiz Henrique',
      email: 'luiz.henrique@fazenda.com.br',
      password: senhaPadrao,
      role: 'ADMIN',
    },
  });

  await prisma.user.upsert({
    where: { email: 'luiz.antonio@fazenda.com.br' },
    update: {},
    create: {
      name: 'Luiz Antonio',
      email: 'luiz.antonio@fazenda.com.br',
      password: senhaPadrao,
      role: 'SOCIO',
    },
  });

  await prisma.user.upsert({
    where: { email: 'leda@fazenda.com.br' },
    update: {},
    create: {
      name: 'Leda',
      email: 'leda@fazenda.com.br',
      password: senhaPadrao,
      role: 'SOCIO',
    },
  });

  const regras = [
    { denominacao: 'Bezerra Fêmea', genero: Genero.FEMEA, idadeMinMeses: 0, idadeMaxMeses: 12, ordem: 1 },
    { denominacao: 'Novilha', genero: Genero.FEMEA, idadeMinMeses: 13, idadeMaxMeses: 30, ordem: 2 },
    { denominacao: 'Vaca', genero: Genero.FEMEA, idadeMinMeses: 31, idadeMaxMeses: null, ordem: 3 },
    { denominacao: 'Bezerro Macho', genero: Genero.MACHO, idadeMinMeses: 0, idadeMaxMeses: 12, ordem: 4 },
    { denominacao: 'Garrote', genero: Genero.MACHO, idadeMinMeses: 13, idadeMaxMeses: 30, ordem: 5 },
    { denominacao: 'Boi', genero: Genero.MACHO, idadeMinMeses: 31, idadeMaxMeses: null, ordem: 6 },
  ];

  for (const r of regras) {
    await prisma.classificacaoConfig.upsert({
      where: { denominacao: r.denominacao },
      update: {},
      create: r,
    });
  }

  console.log('Seed concluído.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
