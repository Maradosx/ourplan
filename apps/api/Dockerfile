# syntax=docker/dockerfile:1
#
# Multi-stage Dockerfile for the OurPlan NestJS API (apps/api).
#
# IMPORTANT — build context assumption:
#   This Dockerfile MUST be built with the *repo root* as the build context
#   (see docker-compose.yml: build.context = "." / dockerfile = apps/api/Dockerfile).
#   This is required because it's a pnpm workspace: the root pnpm-lock.yaml,
#   pnpm-workspace.yaml, and the shared workspace package (packages/shared) all
#   live above apps/api and are needed for a correct, reproducible install.
#
# Prisma note:
#   Prisma 5 auto-detects the Alpine/musl engine ("linux-musl-openssl-3.0.x")
#   when `prisma generate` runs inside this alpine image, so no explicit
#   binaryTargets entry is required in schema.prisma. The generated client lives
#   in node_modules/.prisma/client and is carried into the runtime stage via the
#   copied node_modules.

# ---------------------------------------------------------------------------
# Base: Node 20 Alpine + pnpm via corepack
# ---------------------------------------------------------------------------
FROM node:20-alpine AS base
# openssl + libc compat are needed by Prisma engines on Alpine.
RUN apk add --no-cache libc6-compat openssl
RUN corepack enable
WORKDIR /app
ENV PNPM_HOME=/pnpm
ENV PATH="$PNPM_HOME:$PATH"

# ---------------------------------------------------------------------------
# Dependencies: install the full workspace (filtered to api + its deps)
# ---------------------------------------------------------------------------
FROM base AS deps
# Copy the workspace manifests + lockfile first for better layer caching.
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json ./apps/api/package.json
COPY packages/shared/package.json ./packages/shared/package.json
# Install everything needed to build the api (including its devDependencies
# such as @nestjs/cli, typescript, prisma). --frozen-lockfile keeps it
# reproducible against the committed pnpm-lock.yaml.
RUN pnpm install --frozen-lockfile --filter api... --filter shared

# ---------------------------------------------------------------------------
# Build: generate the Prisma client and compile the NestJS app
# ---------------------------------------------------------------------------
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
# Copy manifests + the actual source.
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api ./apps/api
COPY packages/shared ./packages/shared
# Generate Prisma client (writes to node_modules/.prisma/client) and build.
RUN pnpm --filter api exec prisma generate
RUN pnpm --filter api build

# ---------------------------------------------------------------------------
# Runtime: slim image with only what's needed to run `node dist/main`
# ---------------------------------------------------------------------------
FROM base AS runtime
ENV NODE_ENV=production
ENV PORT=3000

# node_modules (incl. generated .prisma client), built dist, and the prisma
# schema + migrations (needed for `prisma migrate deploy` at startup).
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/package.json ./apps/api/package.json
COPY --from=build /app/apps/api/prisma ./apps/api/prisma
COPY --from=build /app/pnpm-lock.yaml /app/pnpm-workspace.yaml /app/package.json ./

EXPOSE 3000

# Run pending migrations, then start the compiled NestJS server.
# `node dist/main` is invoked from the apps/api working dir so relative paths
# (and the build's "node dist/main" start:prod convention) resolve correctly.
CMD ["sh", "-c", "pnpm --filter api exec prisma migrate deploy && node apps/api/dist/main"]
