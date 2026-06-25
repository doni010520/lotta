FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9 --activate
WORKDIR /app

COPY pnpm-workspace.yaml package.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/menu/package.json apps/menu/
RUN pnpm install --frozen-lockfile || pnpm install

COPY packages/shared packages/shared
COPY apps/menu apps/menu

WORKDIR /app/apps/menu
RUN pnpm build

EXPOSE 3002
CMD ["pnpm", "start"]
