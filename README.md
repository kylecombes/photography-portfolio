# Photography Portfolio

A self-hosted photography website designed to run on a Raspberry Pi (or any Docker host). It's
built around one deliberately simple workflow: **drop a JPEG in a folder, and it appears on the
site.**

When a full-scale JPEG lands in the watched folder, the server automatically:

1. generates a compressed full-size version and a thumbnail (via `sharp`),
2. extracts EXIF metadata — stripping camera/lens **serial numbers** and owner tags for privacy,
3. records the photo in Postgres,

and it shows up in a dark, responsive masonry gallery with a custom lightbox (zoom, pan, swipe,
keyboard nav, auto-fading controls). An optional, privacy-respecting analytics layer records
anonymous per-session viewing behaviour so you can later build a popularity/attention heatmap.

## Features

- **Folder-drop ingestion** — no upload UI; just copy files into `INGEST_DIR`. Idempotent and
  self-healing (existing files are backfilled on startup).
- **Automatic derivatives** — a re-encoded full-size JPEG (quality configurable) and a thumbnail.
  Originals are never modified.
- **EXIF capture with privacy stripping** — full EXIF stored as JSONB; serial numbers, owner, and
  copyright tags removed.
- **Dark masonry gallery** — 5/4/3/2 responsive columns, no layout reflow.
- **Custom lightbox** — swipe / arrow-key / edge-button navigation, zoom (buttons, wheel,
  double-tap) with click-drag panning, controls that fade after 5s of inactivity.
- **Anonymous analytics (optional)** — per-session dwell time, active-time heartbeat, and zoom
  regions, with coarse IP-derived location. No durable tracking; raw IPs are never stored.
- **Runs anywhere Docker does** — three small containers, ARM64-friendly.

## Architecture

```
   you ──copy JPEG──▶  INGEST_DIR (bind mount, read-only)
                              │
                    ┌─────────▼──────────┐        ┌──────────────┐
   visitor ──▶ Caddy ─▶  web (Next.js)   │◀──────▶│  db (Postgres)│
             :80/:443    │  + watcher     │        └──────────────┘
                         │  → /processed  │  (named volume: full + thumb derivatives)
                         └────────────────┘
```

- **`web`** — the Next.js app *and* the folder watcher (the watcher runs as a background process
  in the same container). Serves the gallery, the lightbox, image derivatives, and the analytics
  API.
- **`db`** — Postgres 16, storing photo metadata and analytics.
- **`caddy`** — reverse proxy and automatic HTTPS.

## Stack

Next.js (App Router, TypeScript) · Tailwind CSS · Prisma + Postgres · sharp · chokidar · exifr ·
maxmind · Caddy · **Bun** (package manager + runtime) · Docker Compose.

## Quick start

```sh
git clone <this repo> && cd photography-portfolio
cp .env.example .env
# Edit .env — at minimum set INGEST_DIR (host folder for photos),
# POSTGRES_PASSWORD, and DATABASE_URL to match.

docker compose up -d --build
```

Open `http://localhost/` (or your `SITE_DOMAIN`). Drop a `.jpg` into your `INGEST_DIR` and it
appears within a couple of seconds.

Migrations run automatically on container start (`prisma migrate deploy`).

## Environment variables

| Variable | Purpose | Example |
|---|---|---|
| `INGEST_DIR` | Host folder to watch (bind-mounted read-only to `/ingest`) | `/mnt/photos/incoming` |
| `THUMB_WIDTH` | Thumbnail width in px | `600` |
| `FULL_QUALITY` | JPEG quality (mozjpeg) for the full-size derivative | `70` |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | Postgres init | — |
| `DATABASE_URL` | Connection string (points at the `db` service) | `postgresql://user:pass@db:5432/portfolio?schema=public` |
| `SITE_DOMAIN` | Caddy site address. `:80` for plain HTTP, a domain for auto-HTTPS | `photos.example.com` |
| `GEOLITE_DB` | Path (in-container) to a GeoLite2-City DB for IP→city. Blank = disabled | `/data/GeoLite2-City.mmdb` |

The processed-derivative directory is a fixed in-container path (`/processed`) backed by a named
Docker volume — intentionally not configurable, so no host paths leak into the repo.

## How ingestion works

The watcher (`watcher/index.ts` → `lib/ingest.ts`) uses `chokidar` with `awaitWriteFinish`, so a
file is only processed once it has finished copying. For each supported image
(`jpg/jpeg/png/webp/tiff/avif/heif`) it writes `/processed/full/<name>` and
`/processed/thumb/<name>`, extracts sanitized EXIF, and upserts a `Photo` row keyed by filename
(re-dropping the same name is a safe no-op-ish update). On startup it scans the folder and backfills
anything missing.

Derivatives are served by a Next.js route handler at `/api/image/{full,thumb}/<filename>` with
long-lived immutable caching.

## Analytics & privacy

Analytics are **anonymous and per-visit**. A random UUID is stored in `sessionStorage` (reset every
visit — not a durable cross-visit identifier). Collected:

- **`Session.activeMs`** — foreground time, via a heartbeat every 5s that only fires while the tab
  is visible, so it pauses when you switch tabs, sleep the device, or close the page.
- **`ImageView`** — which photo was viewed and for how long (views under 1 second are ignored).
- **`ZoomRegion`** — the normalized visible bounding box while zoomed in (debounced to at most one
  per 500ms), for building an attention heatmap later.
- **Coarse location** — `city` / `region` / `country` derived from the client IP on first sight.
  **The raw IP is never stored.** Requires a GeoLite2 database (below); without it, location stays
  null and everything else works.

### Enabling geolocation (optional)

1. Create a free [MaxMind](https://www.maxmind.com/en/geolite2/signup) account and download
   `GeoLite2-City.mmdb`.
2. Place it next to `docker-compose.yml` and uncomment the volume line under the `web` service.
3. Set `GEOLITE_DB=/data/GeoLite2-City.mmdb` in `.env` and `docker compose up -d`.

## Image download deterrence

Right-click "Save image", drag-to-desktop, and the native image context menu are disabled on both
the gallery and lightbox. This deters casual saving only — it is **not** true protection. Anyone
can still pull the derivative bytes from the browser's network tab. If that matters, watermark your
exports.

## Development

Everything runtime (app, database, watcher) runs in Docker. A local `bun install` is only for
editor/lint/type-check tooling and, if you want, a fast host dev loop.

```sh
bun install          # tooling only
bun run lint         # eslint
bun run format       # prettier --write
bun test             # unit tests (EXIF sanitization, …)
```

For a fast host dev loop against the containerized Postgres, publish its port and use `.env.local`
(see `docker-compose.override.yml` and `.env.local` conventions). Author schema changes with
`prisma migrate dev`; they're applied in production by the container entrypoint.

See `CLAUDE.md` for code conventions.

## Deploying on a Raspberry Pi

The images build natively on ARM64 (`sharp` ships ARM64 prebuilt binaries; the base image is
`oven/bun:1`).

```sh
# On the Pi (Docker + Docker Compose installed):
git clone <this repo> && cd photography-portfolio
cp .env.example .env      # set INGEST_DIR to a real folder on the Pi, set a strong password
docker compose up -d --build
```

For public HTTPS, point a domain's DNS at the Pi, open ports 80/443, and set `SITE_DOMAIN` to that
domain — Caddy provisions a certificate automatically. To keep it private instead, leave
`SITE_DOMAIN=:80` and reach it over a VPN / Tailscale / Cloudflare Tunnel. If you add a proxy in
front of Caddy, set `trusted_proxies` in the `Caddyfile` so analytics geolocation stays accurate.

## Backups

Three things hold state:

- **`INGEST_DIR`** (your originals) — back these up; they are the source of truth. Everything else
  can be regenerated from them.
- **`pgdata`** Docker volume — photo metadata + analytics. `docker compose exec db pg_dump ...`.
- **`processed`** Docker volume — derivatives; regenerated from originals if lost (delete the
  volume and restart to rebuild).

## Project structure

```
app/                 Next.js routes (gallery page, image + analytics API)
components/           Gallery, PhotoTile, Lightbox, LightboxControls, AnalyticsRoot
hooks/               useZoomPan, useAutoHideControls, useViewTracking, useAnalyticsLifecycle
lib/                 ingest, images, exif, photos, geo, prisma, analytics, config
watcher/             folder watcher entrypoint
prisma/              schema + migrations
Dockerfile, docker-compose.yml, Caddyfile, docker-entrypoint.sh
```
