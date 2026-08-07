# Deploy — Portal Alvim Análises

Guia de referência pra colocar o portal no ar (Railway + domínio na
HostGator, só como DNS). Nenhum valor real de segredo fica neste arquivo —
são preenchidos direto no painel da Railway.

## Arquitetura de deploy

- **web** (`apps/web`, Next.js): único serviço com domínio público. Todo
  acesso do navegador ao backend passa pelo proxy interno do próprio Next.js
  (`app/api/backend/[...path]/route.ts`), então o backend não precisa de
  domínio/HTTPS público — só precisa ser alcançável pelo serviço `web`
  dentro da rede privada da Railway.
- **backend** (`apps/backend`, NestJS): serviço interno, sem domínio
  público exposto.
- **postgres**: banco gerenciado da Railway (plugin oficial).
- **storage de arquivos** (`FILE_STORAGE_LOCAL_PATH`): certificados, fotos
  de serviço, cadeias de custódia — tudo gravado em disco local pelo
  backend. Sem um **Volume** persistente da Railway montado nesse caminho,
  todo arquivo enviado some no próximo deploy. Configurar isso é
  obrigatório antes de usar o portal de verdade em produção.

## Variáveis de ambiente — serviço `backend`

| Variável | Valor |
|---|---|
| `DATABASE_URL` | Fornecida automaticamente pela Railway ao conectar o plugin Postgres (referência `${{Postgres.DATABASE_URL}}`). |
| `PORT` | `3001` |
| `CORS_ORIGIN` | `https://portal.alvimanalises.com.br` |
| `JWT_ACCESS_SECRET` | Gerar novo (não reaproveitar o `change-me-access` do `.env` local — esse é só placeholder de dev). |
| `JWT_ACCESS_EXPIRES_IN` | `15m` |
| `JWT_REFRESH_SECRET` | Gerar novo (idem, nunca reaproveitar `change-me-refresh`). |
| `JWT_REFRESH_EXPIRES_IN` | `7d` |
| `FILE_STORAGE_DRIVER` | `local` |
| `FILE_STORAGE_LOCAL_PATH` | Caminho do Volume montado (ex.: `/data/storage`) — **não** deixar no padrão `./storage` em produção. |
| `RESEND_API_KEY` | Mesma do `.env` local (confirmado com o usuário — pode reaproveitar por ora). |
| `MAIL_FROM_EMAIL` | `agendamentos@alvimanalises.com.br` |
| `WEB_APP_URL` | `https://portal.alvimanalises.com.br` |
| `ANTHROPIC_API_KEY` | Mesma do `.env` local (confirmado com o usuário). |
| `CUSTODY_DOCUMENTS_SYNC_ROOT` | **Não definir em produção** — aponta pra uma pasta OneDrive local da máquina do usuário; o botão "Atualizar pastas" simplesmente não aparece/retorna erro claro sem essa variável, sem quebrar o resto do app. |

## Variáveis de ambiente — serviço `web`

| Variável | Valor |
|---|---|
| `BACKEND_API_URL` | URL interna do serviço `backend` na rede privada da Railway (ex.: `http://backend.railway.internal:3001/api`) — ver aba "Networking" do serviço backend. |
| `NEXT_PUBLIC_APP_NAME` | `Portal Alvim Análises` |
| `PORT` | `3000` (já default do Dockerfile) |

## Passo a passo (Railway)

1. Criar projeto novo na Railway.
2. Add Plugin → PostgreSQL.
3. Add Service → GitHub Repo (ou "Empty Service" + deploy via CLI) → apontar
   pro repositório, **Root Directory: `.`** (raiz do monorepo, não
   `apps/backend`) e **Dockerfile Path: `apps/backend/Dockerfile`**.
4. Configurar as variáveis de ambiente do backend (tabela acima).
5. Settings → Volumes → criar um volume e montar em `/data/storage`;
   ajustar `FILE_STORAGE_LOCAL_PATH=/data/storage`.
6. Repetir o passo 3 pro serviço `web`, com **Dockerfile Path:
   `apps/web/Dockerfile`**.
7. Configurar as variáveis de ambiente do web (tabela acima) — o
   `BACKEND_API_URL` só existe depois que o serviço backend estiver criado
   (pra pegar o hostname interno).
8. No serviço `web` → Settings → Networking → Custom Domain →
   `portal.alvimanalises.com.br`. A Railway mostra um valor de CNAME.
9. Na HostGator (cPanel → Zone Editor, ou onde o DNS do domínio estiver
   gerenciado): criar um registro **CNAME** com host `portal` apontando
   pro valor que a Railway forneceu no passo 8.
10. Aguardar propagação de DNS (minutos a algumas horas) e testar
    `https://portal.alvimanalises.com.br`.

## Migração e seed do banco

A migração roda automaticamente a cada deploy do backend (`prisma migrate
deploy`, ver `apps/backend/Dockerfile` — só aplica o que estiver pendente,
nunca `migrate dev`). O seed de dados de teste (`npm run db:seed`) **não**
deve rodar em produção — ele cria usuários/empresas fictícios. Criar o
primeiro usuário ADMIN real diretamente via um script one-off ou uma rota
administrativa, não pelo seed completo.
