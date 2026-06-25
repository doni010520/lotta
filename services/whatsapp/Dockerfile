FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9 --activate
WORKDIR /app

COPY pnpm-workspace.yaml package.json ./
COPY packages/shared/package.json packages/shared/
COPY services/whatsapp/package.json services/whatsapp/
RUN pnpm install --frozen-lockfile || pnpm install

COPY packages/shared packages/shared
COPY services/whatsapp services/whatsapp

WORKDIR /app/services/whatsapp
EXPOSE 3003
CMD ["pnpm", "dev"]
