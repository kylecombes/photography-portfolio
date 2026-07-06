@AGENTS.md

# Photography Portfolio — conventions

Self-hosted photography site: drop a JPEG into a watched folder → derivatives + EXIF are
generated and recorded in Postgres → shown in a dark masonry gallery with a custom lightbox.
Runs as a Docker stack (`web` = Next.js + watcher, `db` = Postgres, `caddy` = reverse proxy).

## Runtime

- **Bun** is the package manager and runtime. Use `bun install`, `bun run`, `bunx` — never npm/yarn/pnpm.
- Everything runtime (Postgres, migrations, the app, the watcher) runs **in Docker containers**.
  Local `node_modules` exist only for editor/lint/type-check tooling.

## Code hygiene

- Keep files under **~300 lines**. Split when they grow past that.
- Prefer small, focused components; extract sub-components rather than growing one file.
- **No nested ternaries** — use early returns, guard clauses, or a small derived variable
  (enforced by ESLint `no-nested-ternary`).
- Encapsulate stateful/effectful logic in **clearly named custom hooks**
  (`useLightboxControls`, `useSessionHeartbeat`, `useZoomPan`, …) rather than inlining in components.
- Name things for intent; avoid abbreviations. Colocate a component with its hooks and types.
- Keep server/DB access **out of components** — use route handlers, server actions, or small data modules.
- Match the surrounding style. No dead code or commented-out blocks in commits.

## Formatting & linting

- **Prettier** is the source of truth for formatting: single quotes, trailing commas, semicolons,
  100-col width. Run `bun run format`.
- **ESLint**: `bun run lint` (and `bun run lint:fix`).
- **Husky + lint-staged** run Prettier + ESLint on staged files at commit time; keep the hook green.

## Privacy

- Strip camera/lens serial numbers and owner tags from EXIF before storing.
- Analytics are anonymous and per-session (a `sessionStorage` UUID). Never store raw visitor IPs —
  only coarse city/region/country derived from them.
