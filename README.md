# Photography Portfolio

A self-hosted photography website designed to run on a Raspberry Pi (or any Docker host).

**Workflow:** drop a full-scale JPEG into a watched folder → the server automatically generates a
compressed full-size version and a thumbnail, extracts EXIF metadata (with camera/lens serial
numbers stripped), and records the photo in Postgres → it appears in a dark, responsive masonry
gallery with a custom lightbox (zoom, pan, swipe, keyboard nav).

## Stack

- **Next.js** (App Router, TypeScript) + **Tailwind CSS** — web app
- **Prisma** + **Postgres** — metadata & analytics
- **sharp** / **chokidar** / **exifr** — image processing & folder watching (watcher runs inside the web container)
- **Caddy** — reverse proxy / automatic HTTPS
- **Bun** — package manager & runtime
- Orchestrated with **Docker Compose** (`web`, `db`, `caddy`)

## Quick start

```sh
cp .env.example .env
# edit .env — at minimum set INGEST_DIR to the host folder you'll drop photos into,
# and set POSTGRES_PASSWORD / DATABASE_URL.

docker compose up -d --build
```

Then drop a `.jpg` into your `INGEST_DIR` and it will show up on the site.

## Development

Local `bun install` is only for editor/lint/type-check tooling — the app, database, and watcher
all run in Docker.

```sh
bun install        # tooling only
bun run lint       # eslint
bun run format     # prettier --write
```

See `CLAUDE.md` for code conventions.

_(Full setup, environment variables, Pi deployment notes, and backups are documented in a later stage.)_
