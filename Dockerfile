# syntax=docker/dockerfile:1

# Bun on Debian bookworm — sharp's prebuilt ARM64/x64 binaries install cleanly here.
FROM oven/bun:1 AS base
WORKDIR /app

# --- Install dependencies (cached on lockfile) ---
FROM base AS deps
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# --- Build the Next.js app + generate the Prisma client ---
FROM base AS builder
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN bunx prisma generate
RUN bun run build

# --- Runtime image ---
# The whole built app (incl. node_modules, the generated Prisma client, and the
# watcher/) is copied so the Next server, the watcher process, and `prisma migrate
# deploy` all have what they need.
FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=builder /app ./
RUN chmod +x docker-entrypoint.sh
EXPOSE 3000
ENTRYPOINT ["./docker-entrypoint.sh"]
