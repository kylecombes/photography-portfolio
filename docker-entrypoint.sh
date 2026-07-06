#!/bin/sh
set -e

echo "[entrypoint] Applying database migrations..."
bunx prisma migrate deploy

echo "[entrypoint] Starting folder watcher..."
bun run watcher/index.ts &

echo "[entrypoint] Starting Next.js server..."
exec bun run start
