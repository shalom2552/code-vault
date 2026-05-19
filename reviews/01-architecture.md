# Architecture Review — CodeVault

## Summary

CodeVault is a well-scoped personal tool. The directory layout is clean, the
frontend/backend boundary is respected, and the test suite gives real integration
coverage. The main structural problems are a port mismatch that breaks the
production Docker deployment, a double-response bug in every code-execution
timeout path, and two parallel language registries that must stay manually in
sync.

---

## Critical Issues

### 1. Port mismatch — production deployment is broken

`server/index.js:9` binds Express to port **5173**.  
`docker-compose.yml:6` maps `5174:5174` (host → container).  
`Dockerfile:8` exposes **5174**.  
`CLAUDE.md` documents port **5174** everywhere.

In a `docker compose up` production run the server occupies 5173 inside the
container; nothing listens on 5174. The docker-compose port mapping is a no-op
and the app is unreachable from the host. One of the three sources of truth
needs to win; the simplest fix is changing `PORT` in `server/index.js` to 5174.

---

### 2. Double response on execution timeout (data corruption)

Both `POST /api/snippets/:id/run` (routes.js:110–119) and
`POST /api/playground/run` (routes.js:157–166) share the same race:

```
setTimeout(() => {
  child.kill()
  res.json(...)        // ← response #1
}, 10000)

child.on('close', () => {
  clearTimeout(timer)  // too late if timeout already fired
  res.json(...)        // ← response #2 — Express 5 throws ERR_HTTP_HEADERS_SENT
})
```

`clearTimeout` inside the `close` handler only prevents a *future* firing. If
the timeout already fired, `child.kill()` triggers `close` and the second
`res.json` runs against a finished response. Express 5 surfaces this as an
unhandled rejection. Fix: track a `timedOut` boolean and guard the `close`
handler.

---

### 3. `cors` is a declared production dependency but is never imported

`package.json` lists `"cors": "^2.8.6"` in `dependencies`. Neither
`server/index.js` nor `server/routes.js` imports it. Dead weight in the
production image — remove it.

---

## Improvements (ordered by impact)

### A. Extract execution logic out of routes.js

**What:** `routes.js` mixes HTTP routing, filesystem I/O (reads meta.json,
writes files), and subprocess orchestration (compile + spawn + timeout) in one
185-line file.

**Where:** `server/routes.js:84–182`

**Why:** The run/timeout/cleanup pattern is duplicated verbatim between
`/snippets/:id/run` and `/playground/run`. Any fix (e.g. the double-response
bug above) must be applied twice. A shared `execCode({ srcFiles, lang, stdin,
onResult })` helper in `server/executor.js` would eliminate the duplication and
make the timeout logic testable in isolation.

**Approach:** Extract the `spawn`+timeout+cleanup block into a single function
that returns a Promise. Both routes call it. The playground route just adds the
temp-dir lifecycle around it.

---

### B. Unify the language registries

**What:** `server/languages.js` and `src/languages.js` are two parallel
registries for the same three languages. The server registry carries
compile/runner/wrap; the client registry carries label/hljs/defaultFile/
playgroundDefault. Adding a new language requires editing both files and their
respective unit tests.

**Where:** `server/languages.js`, `src/languages.js`

**Why:** There is no enforcement that the two registries agree on which language
IDs exist. Right now `python` is present in both, but the client-languages unit
test only asserts `contains(['cpp', 'c'])` — a future server-only language would
pass all tests silently.

**Approach:** Keep the two different shapes (they genuinely differ), but produce
the client registry from the server one at build time, or maintain a shared
`languages-manifest.json` listing valid IDs so a single source of truth drives
both. At minimum, cross-check the key sets in a unit test.

---

### C. Harden the compile command against shell injection

**What:** `lang.compile(srcFiles, outBin)` in `languages.js` builds a shell
string via template literal: `` `g++ ${files.join(' ')} -o ${bin}` ``. This
string is passed to `exec()` (not `execFile`).

**Where:** `server/languages.js:29,34`, `server/routes.js:123,171`

**Why:** `files` elements are `path.join(DATA_DIR, id, filename)`. `DATA_DIR`
and `id` are server-controlled. `filename` is gated by `validFilename` which
allows only `[a-zA-Z0-9_.-]` — no spaces or shell metacharacters — so the risk
is low in practice. But the defense relies on `validFilename` being applied
consistently (it is at write time; read-time uses the stored `meta.files` which
was originally validated). To eliminate the class entirely, switch `exec` to
`execFile` with an explicit argv array and change `compile` to return `[cmd,
...args]` instead of a string.

---

### D. Centralize configuration

**What:** `PORT` (5173) and the binary prefix `/tmp/cppvault-` are magic
literals in `server/index.js` and `server/routes.js`. `DATA_DIR` already has
env-var support; PORT does not.

**Where:** `server/index.js:9`, `server/routes.js:89`

**Why:** Changing the port requires editing two files and docker-compose; the
current mismatch (issue #1 above) is a direct consequence. A `server/config.js`
that reads env vars with defaults keeps all knobs in one place.

---

### E. Add a `loading` / error state to DetailView

**What:** `DetailView.jsx:18` calls `api.getSnippet(id).then(setSnippet)` with
no `.catch`. Network errors leave the component stuck on "Loading..." forever.

**Where:** `src/views/DetailView.jsx:14–19`

**Why:** On mobile via Tailscale, transient errors are plausible. A simple
`.catch(() => setSnippet({ error: true }))` with an error render path would
surface the failure to the user. `EditorView` has the same gap (line 23).

---

### F. Replace `view` string literals with constants

**What:** `App.jsx` manages navigation via ad-hoc strings: `'list'`, `'detail'`,
`'create'`, `'edit'`, `'editFromList'`. A typo (`'editfromList'`) renders
nothing and fails silently.

**Where:** `src/App.jsx:31–35`

**Why:** A `const VIEWS = { LIST: 'list', ... }` object (or a JS enum pattern)
makes mismatches a visible lint error and enables exhaustive checks.

---

## File Map

```
/
├── Dockerfile               build image: node:24-alpine + gcc/g++/python3; prod server entry
├── docker-compose.yml       prod service (port 5174) + test profile service
├── package.json             deps + scripts (dev/build/start/test)
├── vite.config.js           Vite + React plugin + VitePWA; devOptions disabled
├── vitest.config.js         test runner config; node env, 30s timeout
├── eslint.config.js         ESLint rules
├── index.html               SPA shell; mounts #root
│
├── server/
│   ├── index.js             Express bootstrap; dev: Vite middleware mode; prod: static dist
│   ├── routes.js            ALL backend logic: CRUD handlers + file I/O + compile + spawn
│   └── languages.js         server language registry: ext, compile cmd, runner, playgroundWrap
│
├── src/
│   ├── main.jsx             React root mount + ErrorBoundary
│   ├── App.jsx              top-level: tab/view/selectedId state + navigation callbacks + bottom nav
│   ├── App.css              all application styles (single flat file)
│   ├── index.css            global resets + body font/bg
│   ├── api.js               fetch wrappers for all API endpoints (no error handling)
│   ├── languages.js         client language registry: label, defaultFile, hljsLang, playgroundDefault
│   │
│   ├── components/
│   │   ├── CodeBlock.jsx    highlight.js read-only syntax display
│   │   ├── CodeEditor.jsx   CodeMirror 6 editor; stable extension refs; autoHeight variant
│   │   └── ConfirmDialog.jsx modal confirm/cancel dialog
│   │
│   └── views/
│       ├── ListView.jsx     snippet list + search + tag filter + long-press context menu + FAB
│       ├── DetailView.jsx   snippet detail + file tabs + run panel + delete confirm
│       ├── EditorView.jsx   create/edit form: title/tags/notes/language/files + CodeEditor
│       └── Playground.jsx   scratch pad: per-language localStorage persistence + run + save-as-snippet
│
├── tests/
│   ├── helpers/
│   │   ├── make-app.js      test factory: Express + snippetRoutes(dataDir)
│   │   └── tmp.js           makeTmpDir / removeTmpDir helpers
│   └── integration/
│       ├── snippets-crud.test.js   full CRUD coverage for /api/snippets
│       ├── snippets-run.test.js    compile+run for C++, C, Python; timeout; cleanup
│       └── playground.test.js      playground run for all languages; path scrubbing; cleanup
│   └── unit/
│       ├── client-languages.test.js  validates src/languages.js shape + values
│       └── server-languages.test.js  validates server/languages.js shape + compile/runner output
│
├── public/                  PWA icons + favicon
└── data/                    bind-mounted volume; <uuid>/meta.json + source files
```
