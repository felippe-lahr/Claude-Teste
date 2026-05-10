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

  const tickerValues = [
    { chave: 'boi_gordo', valor: '343,02' },
    { chave: 'vaca_gorda', valor: '312,70' },
    { chave: 'bezerro_8m', valor: '2.795,89' },
    { chave: 'garrote_18m', valor: '4.075,06' },
  ];

  for (const t of tickerValues) {
    await prisma.configGlobal.upsert({
      where: { chave: t.chave },
      update: {},
      create: t,
    });
  }

  const causasMorte = [
    { nome: 'Doença respiratória', ordem: 1 },
    { nome: 'Doença digestiva', ordem: 2 },
    { nome: 'Acidente/Trauma', ordem: 3 },
    { nome: 'Predação', ordem: 4 },
    { nome: 'Desnutrição', ordem: 5 },
    { nome: 'Idade avançada', ordem: 6 },
    { nome: 'Causa desconhecida', ordem: 7 },
  ];

  for (const c of causasMorte) {
    await prisma.causaMortePredefinida.upsert({
      where: { nome: c.nome },
      update: {},
      create: c,
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
