FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9 --activate
WORKDIR /app

COPY pnpm-workspace.yaml package.json ./
COPY packages/shared/package.json packages/shared/
COPY services/integrations/package.json services/integrations/
RUN pnpm install --frozen-lockfile || pnpm install

COPY packages/shared packages/shared
COPY services/integrations services/integrations

WORKDIR /app/services/integrations
EXPOSE 3004
CMD ["pnpm", "dev"]
