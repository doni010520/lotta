FROM node:20-alpine AS deps
RUN corepack enable && corepack prepare pnpm@9 --activate
WORKDIR /app
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages/shared/package.json packages/shared/
COPY services/api/package.json services/api/
RUN pnpm install --frozen-lockfile

FROM node:20-alpine AS runner
RUN corepack enable && corepack prepare pnpm@9 --activate
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=deps /app/services/api/node_modules ./services/api/node_modules
COPY pnpm-workspace.yaml package.json ./
COPY packages/shared packages/shared
COPY services/api services/api
WORKDIR /app/services/api
EXPOSE $(grep PORT .env 2>/dev/null || echo 3001)
CMD ["node", "--import", "tsx", "src/server.ts"]
