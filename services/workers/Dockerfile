FROM node:20-alpine AS deps
RUN corepack enable && corepack prepare pnpm@9 --activate
WORKDIR /app
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages/shared/package.json packages/shared/
COPY services/workers/package.json services/workers/
RUN pnpm install --frozen-lockfile

FROM node:20-alpine AS runner
RUN corepack enable && corepack prepare pnpm@9 --activate
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=deps /app/services/workers/node_modules ./services/workers/node_modules
COPY pnpm-workspace.yaml package.json ./
COPY packages/shared packages/shared
COPY services/workers services/workers
WORKDIR /app/services/workers
EXPOSE 3005
HEALTHCHECK --interval=30s --timeout=3s --retries=3 CMD wget -qO- http://localhost:3005/health || exit 1
USER node
CMD ["node", "--import", "tsx", "src/server.ts"]
