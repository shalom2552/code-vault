# Batch E — Tests — Completed

## tests/unit/server-languages.test.js

- **P28 cross-check:** Added `import { LANGUAGES as clientLANGUAGES } from '../../src/languages.js'` and a new `describe('cross-check: server vs client language registry')` block. Single test: `Object.keys(server).sort()` deep-equals `Object.keys(client).sort()`. Fails if a language is added to one registry but not the other.

## tests/integration/snippets-run.test.js

Added `describe('executor behavior')` with 5 new tests:

1. **Timeout / exitCode 124** — runs an infinite-loop C++ snippet, asserts `exitCode === 124` and `stderr` contains `"Timeout"`.
2. **Responded guard (P3)** — same infinite loop, then issues a second `/api/snippets` GET; asserts it returns 200. If the `done` guard were missing, Express 5 would throw on the double `res.json()` and the server would be in a broken state.
3. **Process-group kill (P10)** — C snippet that `fork()`s a grandchild (writes its PID to `/tmp/cppvault-pgkill-<uuid>`, then loops); parent loops. After timeout, reads the PID file and checks `/proc/<pid>/status`. Asserts state is `'Z'` (zombie / dead) or the file doesn't exist. A running ('R'/'S') state would mean SIGKILL to `-pgid` failed.
4. **Compile error path sanitization (P13)** — invalid C++ snippet, asserts `stderr` does not contain `dataDir` and does not match `/app/data/`.
5. **Stdin cap 64 KB (P14)** — C++ snippet that reads all of stdin and prints `v.size()`; sends 70 KB of `'x'`; asserts output is `65536` (64 × 1024).

Also added `import { randomUUID } from 'crypto'` for the process-group kill test.

## tests/integration/playground.test.js

Added `describe('executor behavior')` with 3 new tests:

1. **Timeout / exitCode 124** — infinite-loop C++ via playground, same assertions.
2. **Responded guard (P3)** — timeout then GET /api/snippets, asserts 200.
3. **Stdin cap 64 KB (P14)** — same stdin-counting C++ program via playground wrapper, sends 70 KB, asserts 65536.

## Bugs documented (reviews/deferred-batch-e.md)

- **BUG-1:** `server-languages.test.js:26,60` — `.toMatch(/^g\+\+/)` and `.toMatch(/^gcc/)` are called on array values (Batch A changed `compile()` return type to `string[]`). If vitest is strict about `toMatch` requiring a string, these two tests are broken. Fix: use `[0].toBe(...)`.
- **BUG-2:** process-group kill test has a vacuous-pass edge case if the grandchild never writes the pidFile (extremely unlikely with a 10s window) or if the zombie is reaped before the assertion runs.

## Notes

Tests must run inside Docker (Alpine + musl + gcc/g++). The process-group kill test uses `fork()` from `unistd.h` and `/proc/<pid>/status` — both Alpine Linux features. Timeout tests take ~12–15s each to complete (10s executor timeout + compile time); individual test timeout set to 25s, within the global 30s vitest config.
