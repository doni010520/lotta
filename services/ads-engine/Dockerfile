FROM node:22-alpine AS deps
RUN corepack enable && corepack prepare pnpm@9 --activate
WORKDIR /app
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages/shared/package.json packages/shared/
COPY services/ads-engine/package.json services/ads-engine/
RUN pnpm install --frozen-lockfile

FROM node:22-alpine AS runner
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
USER node
CMD ["node", "--import", "tsx", "src/server.ts"]
