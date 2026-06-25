FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9 --activate
WORKDIR /app

COPY pnpm-workspace.yaml package.json ./
COPY packages/shared/package.json packages/shared/
COPY services/api/package.json services/api/
RUN pnpm install --frozen-lockfile || pnpm install

COPY packages/shared packages/shared
COPY services/api services/api

WORKDIR /app/services/api
EXPOSE 3001
CMD ["pnpm", "dev"]
