FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9 --activate
WORKDIR /app

COPY pnpm-workspace.yaml package.json ./
COPY packages/shared/package.json packages/shared/
COPY services/workers/package.json services/workers/
RUN pnpm install --frozen-lockfile || pnpm install

COPY packages/shared packages/shared
COPY services/workers services/workers

WORKDIR /app/services/workers
EXPOSE 3005
CMD ["pnpm", "dev"]
