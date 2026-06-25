FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9 --activate
WORKDIR /app

COPY pnpm-workspace.yaml package.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/admin/package.json apps/admin/
RUN pnpm install --frozen-lockfile || pnpm install

COPY packages/shared packages/shared
COPY apps/admin apps/admin

WORKDIR /app/apps/admin
RUN pnpm build

EXPOSE 3000
CMD ["pnpm", "start"]
