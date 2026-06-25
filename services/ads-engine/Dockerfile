FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9 --activate
WORKDIR /app

COPY pnpm-workspace.yaml package.json ./
COPY packages/shared/package.json packages/shared/
COPY services/ads-engine/package.json services/ads-engine/
RUN pnpm install --frozen-lockfile || pnpm install

COPY packages/shared packages/shared
COPY services/ads-engine services/ads-engine

WORKDIR /app/services/ads-engine
EXPOSE 3006
CMD ["pnpm", "dev"]
