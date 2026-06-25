FROM node:20-alpine AS deps
RUN corepack enable && corepack prepare pnpm@9 --activate
WORKDIR /app
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/menu/package.json apps/menu/
RUN pnpm install --frozen-lockfile

FROM node:20-alpine AS builder
RUN corepack enable && corepack prepare pnpm@9 --activate
WORKDIR /app
COPY --from=deps /app .
COPY packages/shared packages/shared
COPY apps/menu apps/menu
WORKDIR /app/apps/menu
RUN pnpm build

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /app/apps/menu/.next/standalone ./
COPY --from=builder /app/apps/menu/.next/static ./apps/menu/.next/static
COPY --from=builder /app/apps/menu/public ./apps/menu/public
EXPOSE 3002
ENV PORT=3002
CMD ["node", "apps/menu/server.js"]
