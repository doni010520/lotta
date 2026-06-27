FROM node:22-alpine AS deps
RUN corepack enable && corepack prepare pnpm@9 --activate
WORKDIR /app
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/site/package.json apps/site/
# --no-frozen-lockfile: apps/site é um pacote novo no workspace e ainda não está
# no pnpm-lock.yaml commitado; resolve as deps no build sem exigir o lockfile.
RUN pnpm install --no-frozen-lockfile

FROM node:22-alpine AS builder
RUN corepack enable && corepack prepare pnpm@9 --activate
WORKDIR /app
COPY --from=deps /app .
COPY apps/site apps/site
WORKDIR /app/apps/site
RUN pnpm build

FROM node:22-alpine AS runner
WORKDIR /app
COPY --from=builder /app/apps/site/.next/standalone ./
COPY --from=builder /app/apps/site/.next/static ./apps/site/.next/static
COPY --from=builder /app/apps/site/public ./apps/site/public
EXPOSE 3007
ENV PORT=3007
CMD ["node", "apps/site/server.js"]
