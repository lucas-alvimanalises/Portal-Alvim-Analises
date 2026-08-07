# Build context precisa ser a RAIZ do monorepo (não apps/web) — mesmo
# motivo do apps/backend/Dockerfile (npm workspaces + packages/shared).
FROM node:20-alpine AS deps
WORKDIR /repo
COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/package.json
COPY apps/backend/package.json apps/backend/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN npm ci

FROM deps AS build
COPY packages/shared packages/shared
COPY apps/web apps/web
RUN npm run build --workspace=@portal-alvim/shared
RUN npm run build --workspace=@portal-alvim/web

# next.config.js já usa output: 'standalone' — em monorepo, o server.js
# tracing sai relativo à raiz do workspace (onde está o lockfile), por isso
# os caminhos abaixo têm o prefixo apps/web/ mesmo dentro do standalone.
FROM node:20-alpine AS runtime
WORKDIR /repo
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
COPY --from=build /repo/apps/web/.next/standalone ./
COPY --from=build /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=build /repo/apps/web/public ./apps/web/public

EXPOSE 3000
CMD ["node", "apps/web/server.js"]
