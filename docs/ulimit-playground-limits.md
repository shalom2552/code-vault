# Playground ulimit Limitation: Go and JavaScript

## What's broken

`POST /api/playground/run` with `language: go` or `language: javascript` always fails.

- **Go** — exits immediately with code 2:
  ```
  fatal error: failed to reserve page summary memory
  ```
- **JavaScript (Node.js)** — hangs for 30 seconds, then returns `exitCode: 124` ("Timeout (30s)")

Both fail before `main()` runs. Compile step works fine.

## Root cause

`server/executor.js` wraps every spawned process in a shell that applies a virtual memory cap:

```js
// executor.js:44
spawn('sh', ['-c', 'ulimit -v 131072 2>/dev/null; ulimit -t 29 2>/dev/null; exec "$@"', '--', cmd, ...args])
```

`ulimit -v 131072` caps virtual memory at **128 MB**. This is appropriate for native binaries (C, C++, Rust) but too small for managed runtimes:

| Runtime | Minimum vmem needed | Under 128 MB cap |
|---|---|---|
| C / C++ / Rust binary | ~4–16 MB | ✅ works |
| Go binary | ~256 MB (GC page allocator reserves large VA ranges upfront) | ❌ exits code 2 |
| Node.js | ~256–512 MB (V8 heap reservation) | ❌ hangs → timeout |

The `2>/dev/null` on `ulimit` suppresses errors if the limit can't be set, but on Linux the limit applies successfully and kills these runtimes.

## Affected paths

- `POST /api/playground/run` — `language: go`, `language: javascript`
- `POST /api/snippets/:id/run` — any snippet with `language: go` or `language: javascript`

Compile-only step (`compileCode` in executor.js) is unaffected — it runs `go build` without ulimit.

## Fix options

**Option A — Raise the cap globally** (quick, less isolation):
```js
// executor.js
'ulimit -v 524288 2>/dev/null; ...'  // 512 MB
```
Easier but reduces memory isolation for C/C++ programs.

**Option B — Per-language ulimit** (surgical):
Add an optional `ulimitVMem` field to `LANGUAGES` in `server/languages.js`. Languages that need more memory (Go, JS) set a higher value; compiled languages keep 128 MB.

```js
// server/languages.js
go: { ..., ulimitVMem: 524288 },
javascript: { ..., ulimitVMem: 524288 },
cpp: { ..., ulimitVMem: 131072 },  // default
```

Then in `executor.js`:
```js
const vmem = lang.ulimitVMem ?? 131072
spawn('sh', ['-c', `ulimit -v ${vmem} 2>/dev/null; ulimit -t 29 2>/dev/null; exec "$@"`, '--', cmd, ...args])
```

**Option C — Document as unsupported** (no code change):
Keep 128 MB. Remove Go and JavaScript from the language registry or mark them execution-only in snippets (no playground).

## Current test status

`tests/integration/playground-extras.test.js` reflects this limitation:
- Go: only compile-error test runs (no "compiles and runs" test)
- JavaScript: all playground run tests are omitted with an explanatory comment
- Rust, Bash: fully tested — both work under 128 MB
