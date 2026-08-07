# Build context precisa ser a RAIZ do monorepo (não apps/backend) — o
# projeto usa npm workspaces, então instalar/compilar corretamente exige o
# package.json de cada workspace e o código de packages/shared (dependência
# local, ver @portal-alvim/shared). No Railway: aponte este serviço pro
# Dockerfile em apps/backend/Dockerfile mas com root directory "." (raiz).
FROM node:20-alpine AS deps
WORKDIR /repo
COPY package.json package-lock.json ./
COPY apps/backend/package.json apps/backend/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN npm ci

FROM deps AS build
COPY packages/shared packages/shared
COPY apps/backend apps/backend
RUN npm run build --workspace=@portal-alvim/shared
RUN npx prisma generate --schema=apps/backend/prisma/schema.prisma
RUN npm run build --workspace=@portal-alvim/backend

FROM node:20-alpine AS runtime
WORKDIR /repo
ENV NODE_ENV=production
COPY --from=deps /repo/node_modules ./node_modules
COPY --from=build /repo/packages/shared ./packages/shared
COPY --from=build /repo/apps/backend ./apps/backend
WORKDIR /repo/apps/backend

EXPOSE 3001

# migrate deploy roda a cada start — idempotente (só aplica migrações
# pendentes), mesmo princípio de "migrate deploy" já usado neste projeto em
# dev (ver ARCHITECTURE.md/CLAUDE.md: nunca "migrate dev" em produção).
CMD ["sh", "-c", "npx prisma migrate deploy --schema=./prisma/schema.prisma && node dist/main.js"]
