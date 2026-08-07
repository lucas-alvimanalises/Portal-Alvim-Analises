# Portal Alvim Análises

Plataforma de gestão de serviços e portal do cliente da Alvim Análises: gerenciamento de clientes, contratos, agendamentos de serviço e análises laboratoriais, substituindo os controles feitos hoje em planilhas.

Esta é a **primeira etapa** do projeto: estrutura completa (backend, web e mobile), autenticação, RBAC e CRUD de Usuários, Clientes, Contratos e Agendamentos. Ver [ARCHITECTURE.md](./ARCHITECTURE.md) para decisões de arquitetura e o que ainda é apenas estrutura preparada (stub) para fases futuras.

## Estrutura do monorepo

```
apps/
  backend/   API REST em NestJS + Prisma + PostgreSQL
  web/       Painel administrativo/portal do cliente em Next.js (App Router)
  mobile/    App para técnicos e clientes em Expo (React Native + Expo Router)
packages/
  shared/    Tipos, enums e constantes TypeScript compartilhados entre as 3 apps
```

## Pré-requisitos

- Node.js 24.x e npm 11.x (ver `.nvmrc`)
- Docker Desktop (para rodar o PostgreSQL localmente)
- Expo Go (app no celular) ou um emulador Android/iOS, para testar o mobile

## Configuração do ambiente

Copie os arquivos de exemplo de variáveis de ambiente:

```bash
cp apps/backend/.env.example apps/backend/.env
cp apps/web/.env.example apps/web/.env.local
cp apps/mobile/.env.example apps/mobile/.env
```

Os valores padrão já funcionam para desenvolvimento local (banco via Docker Compose na porta 5433 do host, mapeada para a 5432 do container — 5433 evita conflito com uma eventual instância de Postgres já rodando na máquina).

## Instalação

Na raiz do monorepo (resolve as 3 apps + o pacote `shared` via npm workspaces):

```bash
npm install
```

## Subindo o banco de dados

```bash
docker compose up -d postgres
```

Isso sobe um PostgreSQL 16 na porta 5433 do host (mapeada para a 5432 do container) com usuário/senha/banco `alvim`/`alvim`/`portal_alvim` (configurável via variáveis de ambiente do `docker-compose.yml`, incluindo `POSTGRES_PORT`). Opcionalmente, para abrir o pgAdmin:

```bash
docker compose --profile tools up -d pgadmin
```

pgAdmin fica disponível em http://localhost:5050 (login `admin@alvim.local` / `admin`).

## Rodando o backend

```bash
cd apps/backend
npm run prisma:migrate   # cria as tabelas
npm run prisma:seed      # popula usuários e dados de teste
npm run dev              # inicia em http://localhost:3001/api
```

> **Windows:** se `prisma migrate`/`prisma db` der `P1000` (autenticação) ou `P1001` (não alcança o servidor) mesmo com o container saudável, troque `localhost` por `127.0.0.1` em `DATABASE_URL` no `.env`. É uma ambiguidade comum de resolução IPv4/IPv6 de "localhost" no Windows — o `.env.example` já vem com `127.0.0.1` para evitar isso.

## Rodando o web

```bash
cd apps/web
npm run dev               # inicia em http://localhost:3000
```

## Rodando o mobile

```bash
cd apps/mobile
npx expo start
```

Escaneie o QR code com o app Expo Go, ou pressione `a`/`i` para abrir num emulador Android/iOS. Ajuste `EXPO_PUBLIC_API_URL` em `apps/mobile/.env` para o IP da sua máquina na rede local (não `localhost`) ao testar em um dispositivo físico.

## Scripts úteis (raiz do monorepo, via Turborepo)

| Comando | Descrição |
|---|---|
| `npm run dev` | Roda backend, web e mobile em paralelo |
| `npm run build` | Builda backend, web, mobile e o pacote shared |
| `npm run lint` | Lint em todas as apps |
| `npm run db:migrate` | Aplica migrations do Prisma (atalho para o backend) |
| `npm run db:seed` | Roda o seed do Prisma (atalho para o backend) |
| `npm run db:studio` | Abre o Prisma Studio para inspecionar o banco |

## Usuários de teste (criados pelo seed)

| Papel | E-mail | Senha |
|---|---|---|
| Administrador | admin@alvim.com.br | Admin@123 |
| Gestor | gestor@alvim.com.br | Gestor@123 |
| Técnico | tecnico@alvim.com.br | Tecnico@123 |
| Cliente | cliente@alvim.com.br | Cliente@123 |

O usuário Cliente do seed tem acesso a **duas** empresas ("Alvim Cliente Teste Ltda" e "Empresa Secundária Teste Ltda") — bom para testar o seletor de empresa no cabeçalho do portal.

## Convenções de código

- TypeScript estrito em todo o projeto; tipos/DTOs compartilhados entre as apps vivem em `packages/shared`.
- Backend segue Clean Architecture por módulo (`domain` / `application` / `infrastructure`) — ver [ARCHITECTURE.md](./ARCHITECTURE.md) antes de adicionar um novo módulo.
- Lint/format: ESLint + Prettier configurados na raiz (`.eslintrc.cjs`, `.prettierrc`), estendidos por cada app.
- Commits: mensagens curtas e descritivas, no imperativo (ex.: "Adiciona CRUD de amostras").
