# Batch A — Backend: Done

## Files Changed

- `server/languages.js` — compile() returns argv array
- `server/executor.js` — new file: compileCode + runCode
- `server/routes.js` — major rework
- `server/index.js` — port, auth, body limit, error handler, startup catch
- `package.json` — remove cors, add express-rate-limit

---

## Changes by P-item

**P1/P25** `server/index.js:10` — `PORT = process.env.PORT ?? 5174` (was hardcoded 5173; now matches docker-compose + Dockerfile)

**P2** Atomic command-injection fix across three files:
- `server/languages.js`: `compile()` now returns `['g++', ...files, '-o', bin]` array instead of shell string
- `server/executor.js`: `compileCode(argv)` uses `spawn(cmd, args)` — no shell interpolation
- `server/routes.js`: removed `exec` import; compilation goes through `compileCode()`; every filename loaded from `meta.json` is re-validated with `validFilename()` before use

**P3** `server/executor.js` — `done` boolean flag in `runCode()` prevents double-resolve when timeout fires then `close` event follows; equivalent to the old `responded` guard but Promise-based

**P4** `server/routes.js` — POST /snippets wrapped in try/catch; on failure calls `fs.rm(dir(id), { recursive: true, force: true })` to roll back partial directory

**P5** `server/executor.js` — `child.on('error', ...)` handler in `runCode()` catches missing-binary or exec failures; equivalent handler in `compileCode()`

**P6** `server/index.js:52` — `main().catch(err => { console.error('startup failed', err); process.exit(1) })`

**P7** `server/routes.js` — POST and PUT both write source files before `meta.json`; on PUT, file unlinks happen before meta write too

**P8** `server/routes.js:36` — `(b.updatedAt ?? '').localeCompare(a.updatedAt ?? '')` — prevents TypeError crash that silently returned `[]`

**P9** `server/index.js:20-26` — `AUTH_TOKEN` env var; middleware on `/api` checks `Authorization: Bearer <token>`; no-op when env var unset (dev mode)

**P10** `server/executor.js:43` — `spawn(..., { detached: true })`; on timeout: `process.kill(-child.pid, 'SIGKILL')` kills entire process group including forked grandchildren

**P11** `server/routes.js:14` — `rateLimit({ windowMs: 60_000, max: 10 })`; applied inline to both `POST /snippets/:id/run` and `POST /playground/run`

**P12** `server/index.js:17` — `express.json({ limit: '128kb' })` (was 10mb); `server/executor.js:44` — shell wrapper sets `ulimit -v 131072` (128 MB virtual memory cap) before exec

**P13** `server/routes.js:112` — snippet-run compile stderr: `stderr.replaceAll(snippetDir + '/', '')` strips internal data dir paths (playground already did this with regex)

**P14** `server/executor.js:51-54` — `Buffer.from(stdin).subarray(0, 64 * 1024)` caps stdin at 64 KB before piping to child

**P15** `server/routes.js:18-23` — `validateTags()`: array required, max 20 elements, each must be string ≤ 50 chars; checked in POST and PUT

**P16** `server/routes.js:11` — `validFilename` regex changed to `/^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/` — first char must be alphanumeric; rejects `.env`, `.bashrc`, etc.

**P17** `server/executor.js:60-62` — `cleanup()` called in timeout handler (was only in close handler); for snippet-run cleanup = `fs.unlink(outBin)`; for playground cleanup = `fs.rm(tmpDir, ...)`

**P20** `server/routes.js:27` — `.catch(e => console.error('DATA_DIR mkdir failed', e))` instead of `.catch(() => {})`

**P21** `server/routes.js` — `console.error(...)` added to every catch block in all six route handlers

**P23** `server/routes.js` — POST validates `title` non-empty string; PUT validates title if `title !== undefined`; both return 400

**P24** `package.json` — removed `cors` (declared but never imported)

**P27** `server/executor.js` — `compileCode` + `runCode` replace ~80 lines of duplicated spawn+timeout+cleanup in both run handlers; both routes now call the shared functions

**P31** `server/index.js:44-47` — global Express error handler after all routes: `(err, req, res, next) => { console.error(...); res.status(500).json(...) }`

---

## Deferred to Other Batches

Nothing deferred — all owned-file changes complete. `express-rate-limit` added to package.json (also in Batch A scope per instructions).

## Notes

- `AUTH_TOKEN` is opt-in: if not set, all API requests pass through (preserves dev workflow)
- `ulimit -v` is set via `sh -c 'ulimit -v 131072 2>/dev/null; exec "$@"'` — `2>/dev/null` makes it non-fatal if the container doesn't allow it; binary path in that command is controlled (UUID-based `/tmp/` path), no injection risk
- `express-rate-limit` package needs `npm install` inside the container after this commit
