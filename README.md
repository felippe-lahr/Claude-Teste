# Fazenda Santo Antônio da Barra

Sistema de gestão de bovinos.

## Stack

- **Next.js 14** (App Router) + TypeScript
- **Tailwind CSS**
- **Prisma** ORM + **PostgreSQL**
- **NextAuth.js** (autenticação)
- Hospedagem: **Railway**

## Desenvolvimento local

```bash
npm install
cp .env.example .env
# preencha DATABASE_URL e NEXTAUTH_SECRET
npx prisma migrate dev
npx prisma db seed
npm run dev
```

## Deploy

Push para `main` → deploy automático em produção.
Push para `develop` → deploy automático em staging.

## Estrutura

```
src/
├── app/              # Rotas (App Router)
│   ├── api/          # API routes
│   ├── login/        # Tela de login
│   └── page.tsx      # Landing
├── lib/              # Prisma, utils, classificação
prisma/
├── schema.prisma     # Modelo de dados
└── seed.ts           # Dados iniciais
```
