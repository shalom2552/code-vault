# Done: Round 1 Backend

Commit: `feat(backend): search, export, bash, pins, history, flags, logging`

## Implemented

| # | Feature | Files |
|---|---------|-------|
| 1 | Full-text search (`?q=`) reads file contents, case-insensitive | `routes.js` |
| 2 | `GET /api/export` — all snippets + inline file contents as JSON array | `routes.js` |
| 3 | Bash language — `.sh`, no compile, `runner = ['/bin/sh', file]` | `languages.js` |
| 4 | Pinned snippets — `meta.pinned`, sort pinned first, `PATCH /:id/pin` toggle, POST/PUT accept field | `routes.js` |
| 5 | Execution history — last 5 runs in `meta.runs[]`, returned in `GET /:id`, stdout/stderr capped at 2000 chars | `routes.js` |
| 6 | Compiler flags — `ALLOWED_FLAGS` whitelist, stored in `meta.compilerFlags`, passed to g++/gcc; validated on POST/PUT | `routes.js`, `languages.js` |
| 7 | Validation — title max 100 chars, notes max 5000 chars on POST/PUT | `routes.js` |
| 8 | `GET /api/health` — `{ status: "ok" }`, registered in `index.js` before auth middleware | `index.js` |
| 9 | `scripts/backup.sh` — tars `data/` with UTC timestamp to `$BACKUP_DIR` (default `<repo>/backups`) | `scripts/backup.sh` |
| 10 | `server/log.js` — `info()`/`error()` with ISO timestamp prefix; all `console.*` in server files replaced | `log.js`, `index.js`, `routes.js` |
| 11 | `docs/env.md` — table of all env vars (PORT, DATA_DIR, AUTH_TOKEN, NODE_ENV, BACKUP_DIR, VITEST) | `docs/env.md` |

## Frontend work deferred

See `reviews/deferred-round1-backend.md` for full frontend contract changes needed to surface these features.
