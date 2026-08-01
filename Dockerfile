# OuterEdit Agency Intelligence Console — Railway deployment.
# Multi-stage: build the pnpm workspace, ship only the static bundle + server.

FROM node:22-alpine AS builder
WORKDIR /app

RUN npm install -g pnpm@10.33.0

# Workspace manifests first for layer caching.
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json tsconfig.base.json ./
COPY packages/finance/package.json packages/finance/package.json
COPY packages/policy/package.json packages/policy/package.json
COPY packages/domain/package.json packages/domain/package.json
COPY fixtures/package.json fixtures/package.json
COPY apps/web/package.json apps/web/package.json

RUN pnpm install --frozen-lockfile

COPY packages ./packages
COPY fixtures ./fixtures
COPY apps/web ./apps/web

RUN pnpm --filter @oe/web build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/apps/web/dist ./apps/web/dist
COPY apps/web/server.mjs ./apps/web/server.mjs

EXPOSE 8080
CMD ["node", "apps/web/server.mjs"]
