FROM node:20-alpine AS deps
RUN corepack enable && corepack prepare pnpm@9 --activate
WORKDIR /app
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages/shared/package.json packages/shared/
COPY services/ads-engine/package.json services/ads-engine/
RUN pnpm install --frozen-lockfile

FROM node:20-alpine AS runner
RUN corepack enable && corepack prepare pnpm@9 --activate
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=deps /app/services/ads-engine/node_modules ./services/ads-engine/node_modules
COPY pnpm-workspace.yaml package.json ./
COPY packages/shared packages/shared
COPY services/ads-engine services/ads-engine
WORKDIR /app/services/ads-engine
EXPOSE 3006
HEALTHCHECK --interval=30s --timeout=3s --retries=3 CMD wget -qO- http://localhost:3006/health || exit 1
USER node
CMD ["node", "--import", "tsx", "src/server.ts"]
