# Master Plan — CodeVault

Sources: 01-architecture, 02-code-quality, 03-security, 04-error-handling, 05-ux-accessibility, 06-performance

---

## Priority List (deduplicated, ordered)

### Tier 1 — Crash / Data Loss / Production Broken

**P1. Port mismatch — app unreachable in production**
`server/index.js:9` binds to 5173; docker-compose maps 5174:5174; Dockerfile exposes 5174.
Fix: change `PORT` default to 5174. (01-arch #1)

**P2. Command injection → RCE via unvalidated filenames in meta.json**
`POST /api/snippets` stores all submitted filenames in meta.json regardless of `validFilename`.
`POST /api/snippets/:id/run` reads `meta.files` back without re-validating and feeds them into
`exec()` via shell interpolation. Attack: two unauthenticated requests → arbitrary shell execution.
Fix: re-validate every filename read from meta.json; switch compile step from `exec()` to
`spawn(compiler, [...srcFiles, '-o', outBin])` — eliminates the shell entirely.
(03-security C1; 03-security M2; 01-arch C; 04-error #10)

**P3. Double `res.json()` on timeout — Express 5 unhandled rejection → process crash**
Both run handlers: `setTimeout` fires → `child.kill()` → `close` event fires → second `res.json()`.
`clearTimeout` inside `close` is too late once the callback is already queued.
Fix: shared `responded` boolean guard in both handlers.
(01-arch #2; 04-error CR-3)

**P4. POST /snippets has no try/catch — disk error crashes Node process**
All three `await fs.*` calls in the create handler are unguarded. Disk full or EACCES →
unhandled promise rejection → Node 15+ terminates. Even if it survives, client hangs forever.
Fix: wrap in try/catch; on failure delete the partial directory and return 500.
(04-error CR-1)

**P5. No `child.on('error')` on spawned processes — crash on missing binary**
Both run handlers call `spawn()` with no error handler. If the compiled binary is missing or not
executable, Node emits uncaught `'error'` → process crash.
Fix: add `child.on('error', handler)` to both spawn sites.
(04-error CR-2)

**P6. `main()` in server/index.js has no `.catch()` — silent startup crash**
Vite creation failure (port in use, bad config) → unhandled async rejection → crash with no
useful output.
Fix: `main().catch(err => { console.error('startup failed', err); process.exit(1) })`.
(04-error CR-4)

**P7. PUT /snippets writes meta.json before source files — partial failure corrupts state**
On disk-full: meta.json reflects new file list; source files are still old (or partially overwritten).
Snippet is permanently inconsistent. Same structural issue in POST (meta written, then files fail).
Fix: write files first, then meta on success; rollback directory on POST failure.
(04-error CR-6)

**P8. Sort crash on missing `updatedAt` — all snippets silently disappear**
`b.updatedAt.localeCompare(a.updatedAt)` on a null/undefined `updatedAt` → TypeError inside
sort → caught by outer catch → `GET /api/snippets` returns `[]` — no log, no indication.
Fix: `(b.updatedAt ?? '').localeCompare(a.updatedAt ?? '')`.
(04-error CR-5)

---

### Tier 2 — Security

**P9. No authentication — all endpoints open to any network peer**
Every route (list, read, create, update, delete, run) requires no credentials. Any host on the
Tailscale network can enumerate snippets, delete them, or execute code.
Fix: static bearer token in env var; check `Authorization: Bearer <token>` in middleware before
any route runs.
(03-security C2)

**P10. Unsandboxed code execution + fork bomb survival**
User code runs with no chroot/seccomp/namespace isolation; full network and filesystem access.
`child.kill()` sends SIGTERM to direct child only — forked grandchildren survive and are
reparented to PID 1, potentially exhausting container PIDs.
Fix: spawn with `{ detached: true }`; on timeout use `process.kill(-child.pid, 'SIGKILL')` to
kill entire process group. Long-term: wrap execution in `bubblewrap`/`unshare` with `--net`
disabled and `ulimit` on virtual memory, CPU, and process count.
(03-security C3; 03-security H1)

**P11. No rate limiting on run endpoints**
`/playground/run` and `/snippets/:id/run` start a full compile+exec cycle on every request.
A bug or attacker can pin dozens of gcc processes for 10–15 seconds each.
Fix: `express-rate-limit` on `/api/*/run`; ~10 req/min per IP is sufficient for personal use.
(03-security H2)

**P12. Memory and disk exhaustion**
No `ulimit -v` before exec; no limit on snippet count or total data size; body limit is 10 MB
(generous for code). Playground creates temp files with no quota.
Fix: body limit → 128 KB; `ulimit -v 131072` before exec; optional: snippet count check on create.
(03-security H3)

**P13. Compile stderr exposes internal paths (snippet run)**
Playground sanitizes `g++` stderr paths; snippet run does not — full `/app/data/<uuid>/file.cpp`
paths leak in error output.
Fix: apply same `replace()` sanitization to snippet-run compile stderr.
(03-security M1)

**P14. No stdin size limit**
`stdin` from request body piped to child with no truncation; 10 MB stdin (within body limit) can
OOM or stall a process.
Fix: cap stdin at 64 KB in the route handler before piping.
(03-security M3)

**P15. `tags` array has no element-level validation**
No max element count, no per-element length limit, no type enforcement. A huge tags payload
within the body limit writes a massive meta.json deserialized on every list poll.
Fix: max 20 tags, each ≤ 50 chars, string type enforced.
(03-security M4)

**P16. `validFilename` allows dot-prefix names (`.env`, `.bashrc`)**
Regex `/^[a-zA-Z0-9_.-]+$/` permits hidden files. No practical impact inside UUID dirs but
violates least-surprise.
Fix: require first char to be `[a-zA-Z0-9]`.
(03-security L1)

**P17. Orphaned compiled binary on timeout**
`fs.unlink(outBin)` runs in `close` handler only. If process is SIGKILLed externally or Node
crashes before close fires, the binary is left in `/tmp`.
Fix: also unlink in the timeout handler (playground already does this).
(03-security L2)

---

### Tier 3 — Silent Failures (Bug-class)

**P18. `api.js` does not check `res.ok` — HTTP errors silently succeed**
A 404, 500, or proxy-injected HTML response is parsed as if it were success data, or throws on
JSON.parse of non-JSON — with the rejection propagating to callers that have no `.catch()`.
Fix: check `res.ok`; throw `new Error(\`HTTP \${res.status}\`)` on failure.
(04-error SF-1)

**P19. All frontend async handlers missing error handling — stuck spinners + silent failures**
Affects: `DetailView` (load, run, delete), `EditorView` (load, save), `ListView` (load, delete),
`Playground` (run). In every case: loading/saving/running state never cleared on error; no error
message shown; some flows navigate to broken states (e.g., `onSave(undefined)` → infinite
loading). Fix: wrap all async handlers in try/catch/finally; `finally` clears the spinner;
`catch` sets an `error` state string rendered near the action.
(04-error SF-2 through SF-9; 04-error MS-1 through MS-4; 01-arch E)

**P20. `DATA_DIR` creation failure silently swallowed**
`fs.mkdir(DATA_DIR).catch(() => {})` hides a missing/unwritable mount. All subsequent routes
fail with opaque 404s or empty arrays — no root-cause diagnostic.
Fix: log the error; optionally exit if DATA_DIR is critical.
(04-error SF-10)

**P21. Zero error logging in route handlers**
No `console.error` anywhere in `server/routes.js`. Every catch block swallows. Production
incidents are undiagnosable.
Fix: `console.error('[route] [method] failed', { id }, err)` in every catch.
(04-error SF-11)

**P22. `alert()` / `confirm()` — blocking, unstyled, Android-hostile**
`EditorView` uses `alert('Title required')` for validation. `Playground` uses `confirm()` for
reset. Inconsistent with `ConfirmDialog` used elsewhere. On Android PWA, blocks the UI thread.
Fix: `EditorView` → inline error string near Save button; `Playground` → `ConfirmDialog`.
(04-error MS-3; 05-ux #2; 02-quality)

**P23. Server-side title validation missing**
Client validates title but server does not. Direct API call or client bug creates snippets with
empty titles.
Fix: validate `title` in POST and PUT handlers; return 400 on failure.
(04-error #9)

---

### Tier 4 — Architecture / Code Quality

**P24. `cors` package declared in dependencies but never imported**
Dead weight in the production image.
Fix: remove from `package.json`.
(01-arch #3)

**P25. PORT is a magic literal — config not centralized**
`PORT = 5173` hardcoded in `server/index.js`. Changing it requires editing the file, docker-compose,
and the Dockerfile. Direct cause of P1.
Fix: `const PORT = process.env.PORT ?? 5174` in `server/index.js`; optionally a `server/config.js`.
(01-arch D; 02-quality magic values)

**P26. `exec()` duplication removed by switching to `spawn()` (covered by P2)**
Once P2 is fixed by switching compile to `spawn()`, `exec` import can be removed entirely.
Already merged into P2.

**P27. Duplicate execution logic in routes.js**
`runSnippet` and `runPlayground` share ~80% identical spawn+timeout+cleanup code. Any fix (like
P3) must be applied twice.
Fix: extract shared `executeCode({ srcFiles, lang, stdin, tmpDir })` → `server/executor.js`.
(01-arch A; 02-quality)

**P28. Two parallel language registries with no cross-check**
`server/languages.js` and `src/languages.js` must be kept in sync manually. No test verifies
they agree on which language IDs exist.
Fix: at minimum, add a cross-check in unit tests comparing key sets. Optionally: shared
`languages-manifest.json` as single source of truth for IDs.
(01-arch B; 02-quality)

**P29. View navigation uses ad-hoc string literals**
`App.jsx` navigates via bare strings `'list'`, `'detail'`, `'create'`, `'edit'`, `'editFromList'`.
Typo renders nothing, fails silently.
Fix: `const VIEWS = { LIST: 'list', DETAIL: 'detail', ... }`.
(01-arch F)

**P30. Dead code cleanup**
- `App.css`: unused `.code-textarea` class
- `ListView.jsx`: unused `deleting` state (set but never read in render)
- `src/api.js`: rename `json` helper to `parseResponse` (misleading name)
- `EditorView.jsx`: replace custom `uid()` with `crypto.randomUUID()`
(02-quality)

**P31. Global Express error middleware missing**
Unhandled errors thrown in route handlers have no catch-all. Express 5 async errors propagate to
the default handler which may not return JSON.
Fix: add `app.use((err, req, res, next) => { console.error(err); res.status(500).json({...}) })`
after all routes in `server/index.js`.
(04-error #4)

---

### Tier 5 — UX / Accessibility

**P32. Non-semantic HTML — div/span with onClick instead of button/a**
`snippet-card`, `ctx-overlay`, and others use divs. Not keyboard-focusable, not announced by
screen readers.
Fix: convert interactive elements to `<button>` or `<a>` with appropriate roles.
(05-ux accessibility)

**P33. Bottom nav icons missing aria-label**
`SnippetsIcon` and `PlayIcon` buttons have no `aria-label` or `title`. Screen readers announce
nothing useful.
Fix: add `aria-label="Snippets"` / `aria-label="Playground"` to nav buttons.
(05-ux #3)

**P34. ConfirmDialog and ctx-menu do not trap focus**
Tab navigates outside the modal. Focus is not returned to the trigger element on close.
Fix: focus trap on mount; restore focus on unmount.
(05-ux accessibility)

**P35. Context menu not keyboard-accessible**
Edit/Delete are hidden behind long-press with no keyboard equivalent. Power users and
accessibility users cannot reach these actions.
Fix: add a kebab `⋮` button visible on focus/hover that opens the context menu.
(05-ux #1)

**P36. SVG icons lack aria-hidden or descriptive text**
Icons inside labeled buttons should have `aria-hidden="true"`. Icons that are the sole button
content need `aria-label` on the button.
Fix: audit all `<svg>` in buttons; add `aria-hidden` or move label to button.
(05-ux accessibility)

**P37. Color contrast — card-tag at 0.7 opacity may fail WCAG AA**
`var(--accent)` at 0.7 on `var(--surface)` for small tag text.
Fix: verify contrast ratio; bump opacity or use a darker foreground.
(05-ux accessibility)

**P38. Touch targets below 44×44px**
`remove-file-btn` in EditorView and `back-btn` in nav-header.
Fix: set `min-width: 44px; min-height: 44px` on those elements.
(05-ux polish)

---

### Tier 6 — Performance

**P39. Playground writes localStorage synchronously on every keystroke**
`localStorage` is a blocking, synchronous API. On low-end devices or large content, causes
typing lag.
Fix: debounce the write with a 500ms timer.
(06-perf)

**P40. ListView recalculates `allTags` and `filtered` on every render**
`flatMap`, `Set`, and `filter` run on every render with no memoization.
Fix: `useMemo` for both, keyed on `[snippets, search, selectedTag]`.
(06-perf)

**P41. Search filter runs on every keystroke without debounce**
Acceptable for small lists; degrades at scale.
Fix: debounce `search` state update ~150ms.
(06-perf)

**P42. No code splitting — all views and heavy deps in one bundle**
`@uiw/react-codemirror` and `highlight.js` load even if the user only views the snippet list.
Fix: `React.lazy` + `Suspense` in `App.jsx` for `EditorView`, `DetailView`, `Playground`.
(06-perf)

**P43. CodeEditor and CodeBlock not memoized**
Re-render on any parent state change (e.g., typing in title rerenders all file editors).
Fix: `React.memo` on both components.
(06-perf)

**P44. GET /api/snippets does N `fs.readFile` calls — O(n) I/O**
Scales poorly beyond hundreds of snippets.
Fix: maintain an in-memory cache or `index.json` written on create/update/delete.
(06-perf)

**P45. ListView re-fetches on every mount**
No caching; switching back from Detail triggers a full list reload.
Fix: simple module-level cache with TTL, or React Query.
(06-perf)

---

### Tier 7 — Polish

**P46. No "Clear Search" action in empty search state** (05-ux)
**P47. Hover states missing on snippet-card and tag-chip for desktop** (05-ux)
**P48. Enhanced empty state with CTA** (05-ux)
**P49. View transitions** (05-ux)
**P50. Optimistic delete in ListView** (05-ux)
**P51. Playground save button disabled for unmodified template — confusing** (05-ux)
**P52. Multi-file navigation in EditorView (tabs or sidebar)** (05-ux)
**P53. Run button output area needs skeleton/spinner, not just `…`** (05-ux)

---

## File Change Map

### server/index.js
- [Crash/P1] Fix PORT default: 5173 → 5174
- [Crash/P6] `main().catch(err => { console.error(...); process.exit(1) })`
- [Security/P9] Bearer token auth middleware before all routes
- [Security/P11] `express-rate-limit` on `/api/*/run`
- [Quality/P25] `const PORT = process.env.PORT ?? 5174`
- [Quality/P31] Global Express error middleware (after all routes)

### server/routes.js
- [Crash/P3] Add `responded` boolean guard to both run handlers (timeout + close race)
- [Crash/P4] Wrap POST /snippets body in try/catch; rollback dir on failure
- [Crash/P5] Add `child.on('error', handler)` to both spawn sites
- [Crash/P7] Reorder PUT /snippets: write source files first, then meta.json
- [Crash/P8] Fix sort: `(b.updatedAt ?? '').localeCompare(a.updatedAt ?? '')`
- [Security/P2] Re-validate every filename from `meta.files` before use in compile command
- [Security/P2] Switch compile invocation from `exec()` to `spawn()` (receives array from languages.js)
- [Security/P10] Use `{ detached: true }` + `process.kill(-child.pid, 'SIGKILL')` on timeout
- [Security/P12] Reduce `express.json({ limit: '128kb' })`
- [Security/P13] Sanitize compile stderr for snippet run (same replace() as playground)
- [Security/P14] Cap `stdin` at 64 KB before piping
- [Security/P15] Validate tags: max 20, each ≤ 50 chars, string type
- [Security/P16] Fix `validFilename` to reject dot-prefix: `/^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/`
- [Security/P17] Add `fs.unlink(outBin)` to timeout handler (snippet run path)
- [Bug/P21] Add `console.error(...)` to every catch block
- [Bug/P23] Validate `title` (non-empty string) in POST and PUT; return 400
- [Bug/P20] Log (don't swallow) DATA_DIR mkdir failure
- [Quality/P27] Replace duplicated spawn+timeout+cleanup with call to `server/executor.js`

### server/languages.js
- [Security/P2] Change `compile()` return type from shell string to argv array:
  `compile: (files, bin) => ['g++', ...files, '-o', bin]`
- (Affects C and C++ entries; Python already uses spawn)

### server/executor.js *(new file)*
- [Quality/P27] Shared `executeCode({ srcFiles, lang, stdin, tmpDir })` → Promise
  Encapsulates: spawn, stdout/stderr accumulation, stdin pipe, timeout + `responded` guard,
  `child.on('error')`, process-group kill, binary/tmpDir cleanup.
  Both run handlers call this; no more duplicated logic.

### src/api.js
- [Bug/P18] Add `res.ok` check; throw `new Error(\`HTTP \${res.status}: ...\`)` on failure
- [Quality/P30] Rename `json` helper → `parseResponse`

### src/views/DetailView.jsx
- [Bug/P19] Add `.catch(e => setError(e.message))` to `api.getSnippet` call
- [Bug/P19] Wrap `handleRun` in try/catch/finally; `finally` clears `running`; `catch` sets `error`
- [Bug/P19] Wrap `handleDelete` in try/catch; `catch` shows error, keeps dialog open with message
- [Bug/P19] Add `error` state; render error banner when set
- [Bug/P19] Add missing-file indicator in file tabs (currently silently empty)

### src/views/EditorView.jsx
- [Bug/P19] Add `.catch(e => setError(e.message))` to `api.getSnippet` in edit load
- [Bug/P19] Wrap `handleSave` in try/catch/finally; `finally` clears `saving`; `catch` shows inline error
- [Bug/P22] Replace `alert('Title required')` with inline error string state
- [Bug/P19] Add `error` state; render near Save button
- [Quality/P30] Replace `uid()` with `crypto.randomUUID()`

### src/views/ListView.jsx
- [Bug/P19] Add error state to `load()` — distinguish "network error" from "empty vault"
- [Bug/P19] Wrap `handleDelete` in try/catch/finally; `catch` shows error; `finally` clears state
- [Quality/P30] Remove unused `deleting` state
- [Perf/P40] `useMemo` for `allTags` and `filtered`
- [Perf/P41] Debounce search state update ~150ms
- [UX/P35] Add visible `⋮` button on cards (keyboard/hover accessible) to open context menu

### src/views/Playground.jsx
- [Bug/P19] Wrap run handler in try/catch/finally; `finally` clears `running`
- [Bug/P22] Replace `confirm()` for reset with `ConfirmDialog`
- [Perf/P39] Debounce `localStorage` writes 500ms

### src/App.jsx
- [Quality/P29] Extract `const VIEWS = { LIST, DETAIL, CREATE, EDIT, EDIT_FROM_LIST }` constants
- [Quality/P29] Replace all string literals with `VIEWS.*`
- [Perf/P42] `React.lazy` + `Suspense` for `DetailView`, `EditorView`, `Playground`

### src/App.css
- [Quality/P30] Remove unused `.code-textarea` rule
- [UX/P37] Verify/fix color contrast for `.card-tag` (opacity or foreground color)
- [UX/P47] Add hover states for `.snippet-card`, `.tag-chip`
- [UX/P38] Set `min-width: 44px; min-height: 44px` on `.remove-file-btn`, `.back-btn`

### src/components/CodeEditor.jsx
- [Perf/P43] Wrap export in `React.memo`
- [UX/P36] Ensure any icon-only buttons inside have `aria-label`

### src/components/CodeBlock.jsx
- [Perf/P43] Wrap export in `React.memo`

### src/components/ConfirmDialog.jsx
- [UX/P34] Add focus trap on mount; restore focus to trigger on unmount

### package.json
- [Quality/P24] Remove `cors` from dependencies
- [Security/P11] Add `express-rate-limit` to dependencies

### tests/unit/server-languages.test.js *(or new cross-check test)*
- [Quality/P28] Add test: `Object.keys(serverLanguages)` deep-equals `Object.keys(clientLanguages)`

### tests/integration/snippets-run.test.js *(post-Batch-A)*
- Update to reflect executor.js extraction; verify `responded` guard behavior; verify process-group kill

---

## Work Packages

### Batch A — Backend (server/)
**Files owned exclusively:**
- `server/index.js`
- `server/routes.js`
- `server/languages.js`
- `server/executor.js` *(new)*

**Items covered:** P1, P2, P3, P4, P5, P6, P7, P8, P9, P10, P11, P12, P13, P14, P15, P16, P17, P20, P21, P23, P24 (package.json tag), P25, P27, P31

**Note:** P2 requires coordinated change across `routes.js` AND `languages.js` (compile() return type) AND `executor.js` (spawn call) — do all three atomically.

---

### Batch B — Frontend Views (src/views/)
**Files owned exclusively:**
- `src/views/DetailView.jsx`
- `src/views/EditorView.jsx`
- `src/views/ListView.jsx`
- `src/views/Playground.jsx`

**Items covered:** P19 (all frontend async error handling), P22 (alert/confirm replacement), P35, P39, P40, P41

**Note:** Batch B can start before Batch C (api.js) is done — try/catch blocks work regardless of whether api.js throws real errors or silently returns error objects. Both layers should be fixed; order doesn't matter.

---

### Batch C — Frontend Shared (src/ top-level + components)
**Files owned exclusively:**
- `src/api.js`
- `src/App.jsx`
- `src/App.css`
- `src/components/CodeEditor.jsx`
- `src/components/CodeBlock.jsx`
- `src/components/ConfirmDialog.jsx`

**Items covered:** P18, P29, P30 (dead code/rename), P32 (ConfirmDialog focus trap), P33, P34, P36, P37, P38, P42, P43, P47

---

### Batch D — Config + Package
**Files owned exclusively:**
- `package.json`

**Items covered:** P24 (remove cors), P11 (add express-rate-limit)

**Note:** Batch D is tiny and low-risk. Can be done by any agent or folded into Batch A.

---

### Batch E — Tests (post-A)
**Files owned exclusively:**
- `tests/unit/server-languages.test.js` (or new cross-check file)
- `tests/integration/snippets-run.test.js`
- `tests/integration/playground.test.js`

**Items covered:** P28 (language registry cross-check), integration test updates for executor extraction

**Dependency:** Must run after Batch A is merged — tests exercise the new executor interface.

---

### Batch F — Polish (post B+C)
**Files owned exclusively:**
- `src/App.css` (hover states, transitions — if not done in Batch C)
- `src/views/ListView.jsx` (UX: clear search button, empty state CTA — if not done in Batch B)
- `src/views/Playground.jsx` (save button logic — if not done in Batch B)

**Items covered:** P46–P53

**Dependency:** After Batch B and C are stable. Low risk, cosmetic only.

---

## Batch Dependency Order

```
Phase 1 (parallel — no file overlap):
  ├── Batch A  (server/*)
  ├── Batch B  (src/views/*)
  ├── Batch C  (src/api.js, src/App.jsx, src/App.css, src/components/*)
  └── Batch D  (package.json)

Phase 2 (after Phase 1):
  └── Batch E  (tests/* — needs Batch A's new executor interface)

Phase 3 (after Phase 2 passes):
  └── Batch F  (polish — needs stable B+C)
```

**Critical path:** P1 (port fix) → unblocks testing anything in production.
P2 (command injection) → depends on `languages.js` + `routes.js` + `executor.js` changing together — atomic within Batch A.
P3/P4/P5 → all Batch A, no external dependencies.
P18 (api.js) + P19 (views) → Batch B and C in parallel, both needed for full fix.

**Minimum viable safety patch (can ship before full refactor):**
Batch A P1 + P2 + P3 + P4 + P5 + P6 + P8 + P9 = port fix + RCE close + crash prevention + auth.
Everything else improves quality but does not leave the server in a crashable or exploitable state.
