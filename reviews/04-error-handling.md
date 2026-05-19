# Error Handling Review — CodeVault

Reviewer: reliability pass  
Date: 2026-05-19  
Scope: all source files — read-only

---

## Summary

The backend has two paths that can crash the Node.js process outright (unhandled rejections, missing spawn error handler). The frontend has zero error handling on async operations — every network failure leaves a component in a permanently broken state (stuck spinner, stuck save button, infinite loading screen) with no user-visible feedback. Partial writes on create/update leave orphaned or inconsistent data on disk. There is no error logging anywhere in the server routes — failures are completely invisible to operators.

---

## Crash Risks

These can bring down the server process or permanently corrupt data.

### CR-1 · `server/routes.js:42-52` — POST /snippets unwrapped, crashes on disk error

The entire create handler body is not inside a try/catch. All three async file operations can fail:

```js
await fs.mkdir(dir(id), { recursive: true })       // no try/catch
await fs.writeFile(path.join(dir(id), 'meta.json'), ...)  // no try/catch
await Promise.all(files.filter(...).map(f => fs.writeFile(...)))  // no try/catch
```

Disk full, permission denied, or mount gone → unhandled promise rejection → Node.js 15+ terminates the process.  
Even if the process survives (older Node), the response is never sent and the client hangs indefinitely.

### CR-2 · `server/routes.js:102`, `routes.js:148` — No `child.on('error')` handler on spawned processes

Both `runProgram()` and `runPlayground()` call `spawn(cmd, args)` with no error handler:

```js
const child = spawn(cmd, args)
// child.on('error', ...) is missing
```

If the binary doesn't exist or isn't executable after compile (disk full, race condition), Node.js emits an uncaught `'error'` event on the child process → process crash. The stdin `'error'` handler exists (`child.stdin.on('error', () => {})`) but the process-level one does not.

### CR-3 · `server/routes.js:110-119` + `routes.js:157-166` — Race condition: double `res.json()` call

The timeout and the `close` handler can both fire in the same event-loop tick if the child exits precisely when the 10-second timer fires:

```js
const timer = setTimeout(() => {
  child.kill()
  res.json({ ..., stderr: 'Timeout (10s)', ... })  // path A
}, 10000)

child.on('close', (code) => {
  clearTimeout(timer)
  res.json({ ... })  // path B — can race with A
})
```

`clearTimeout` is not synchronous — if the timer callback is already queued when `close` fires, both run. Express throws `ERR_HTTP_HEADERS_SENT` → unhandled error in request context. Same pattern in both run handlers.

### CR-4 · `server/index.js:35` — `main()` has no `.catch()`

```js
main()
```

If Vite server creation fails (port in use, missing config, file permission), the async rejection is unhandled → process crash with no useful context.

### CR-5 · `server/routes.js:25` — `sort` on missing `updatedAt` crashes silently, drops all snippets

```js
.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
```

Any meta.json on disk where `updatedAt` is `null`, missing, or not a string → `TypeError` inside sort → caught by the outer `catch` on line 26 → returns `[]`. All snippets disappear from the UI with no explanation, and there is no log entry.

### CR-6 · `server/routes.js:63` — PUT /snippets writes meta before files; partial failure corrupts state

```js
await fs.writeFile(path.join(dir(id), 'meta.json'), JSON.stringify(updated, null, 2))  // committed
if (files) {
  await Promise.all(files.filter(...).map(f => fs.writeFile(...)))  // may fail
```

If the second step fails (disk full), meta.json reflects the new file list but the actual source files on disk still have the old content (or the old files were already partially overwritten). The snippet is now in an inconsistent state — meta says one thing, disk says another.

Same structure in POST /snippets: if `Promise.all(files.map(...writeFile...))` fails after meta.json is written, the directory is left orphaned with a valid meta.json and no source files.

---

## Silent Failures

Errors that are swallowed — the user sees nothing, no log exists.

### SF-1 · `src/api.js:1-27` — All API methods swallow network errors

```js
const json = (res) => res.json()
```

This does not check `res.ok`. A 404, 500, or non-JSON response (e.g., 502 HTML from a proxy) will either silently return `{ error: '...' }` as if it were success data, or throw when parsing non-JSON — with that rejection propagating to every caller, none of which have `.catch()`.

### SF-2 · `src/views/DetailView.jsx:18` — Load failure → infinite "Loading..."

```js
api.getSnippet(id).then(setSnippet)
```

No `.catch()`. Network error → `snippet` stays `null` → `return <div className="loading">Loading...</div>` shows forever. User has no way to know the load failed, no retry button, must navigate back manually.

### SF-3 · `src/views/DetailView.jsx:26-31` — `handleRun` — stuck spinner, no error

```js
const handleRun = async () => {
  setRunning(true)
  setRunOutput(null)
  const out = await api.runSnippet(id, stdin)   // throws on network failure
  setRunOutput(out)
  setRunning(false)                              // never reached
}
```

Network failure → `setRunning(false)` never called → Run button permanently shows "…" and is disabled for the rest of the session. `runOutput` stays `null`. No error message of any kind.

### SF-4 · `src/views/DetailView.jsx:21-24` — `handleDelete` — failure invisible

```js
const handleDelete = async () => {
  await api.deleteSnippet(id)    // throws on failure
  onDeleted()                    // never reached
}
```

Delete failure → `onDeleted()` never called → user stays on DetailView with the confirmation dialog still open (the dialog's `confirming` state is never set to false on failure). No error message. User can only cancel and retry blindly.

### SF-5 · `src/views/EditorView.jsx:59-76` — `handleSave` — stuck button + silent navigation to broken state

```js
setSaving(true)
const saved = isEdit
  ? await api.updateSnippet(snippetId, body)   // may throw or return { error: '...' }
  : await api.createSnippet(body)
setSaving(false)                               // not reached on throw
onSave(saved.id)                              // saved.id is undefined if response is error object
```

Three failure modes:
1. Network error → `setSaving(false)` never called → Save button stuck disabled forever.
2. Server returns `{ error: 'Not found' }` (still resolves) → `saved.id` is `undefined` → `onSave(undefined)` → `DetailView` renders with `id=undefined` → fetches `/api/snippets/undefined` → 400/404 → `snippet` stays null → infinite loading screen.
3. No inline error ever displayed to the user.

### SF-6 · `src/views/EditorView.jsx:21-33` — Edit load failure → blank form silently

```js
api.getSnippet(snippetId).then(d => {
  if (ignored) return
  setForm({ ... })
})
// no .catch()
```

Network error → `setForm` never called → form stays at the blank initial state. User sees an empty title and empty file content — indistinguishable from a new snippet. If they click Save, they overwrite their snippet with empty content.

### SF-7 · `src/views/ListView.jsx:18-23` — Load failure shows "No snippets yet"

```js
api.listSnippets()
  .then(d => { setSnippets(d); setLoading(false) })
  .catch(() => setLoading(false))
```

The catch sets loading=false but `snippets` stays `[]`. The UI renders the "No snippets yet" empty state — identical to a genuinely empty vault. User cannot distinguish a network failure from having no data.

### SF-8 · `src/views/ListView.jsx:53-59` — Delete failure leaves dialog open

```js
const handleDelete = async () => {
  setDeleting(true)
  await api.deleteSnippet(confirmTarget.id)    // throws on failure
  setConfirmTarget(null)                        // never reached
  setMenuSnippet(null)
  setDeleting(false)
  load()
}
```

Failure → `confirmTarget` never cleared → dialog stays open. `deleting` state is set to `true` permanently but is not used in the render, so the button doesn't visually disable. No error message shown.

### SF-9 · `src/views/Playground.jsx:36-41` — Run failure → stuck button

Exact same pattern as SF-3. `setRunning(false)` never called on error → Run button permanently disabled.

### SF-10 · `server/routes.js:15` — DATA_DIR creation failure silently swallowed

```js
fs.mkdir(DATA_DIR, { recursive: true }).catch(() => {})
```

If DATA_DIR can't be created (wrong permissions, read-only mount), this is silently discarded. Every subsequent route that reads or writes to DATA_DIR will fail with `ENOENT` or `EACCES`, and those errors will be caught and returned as 404s or empty arrays — with no indication that the root cause is a missing data directory.

### SF-11 · Zero error logging in all route handlers

Not a single `console.error` exists in `server/routes.js`. Every catch block either sends a response or drops the error:

```js
} catch { res.json([]) }
} catch { res.status(404).json({ error: 'Not found' }) }
} catch { return res.status(404).json({ error: 'Not found' }) }
```

A corrupt file, a permissions error, a bug in JSON parsing — all produce the same response with zero server-side diagnostic output.

---

## Missing States

UI states not handled.

### MS-1 · ListView — no error state

Only: loading | empty | populated. No error state. Network failure looks identical to an empty vault (see SF-7).

### MS-2 · DetailView — no error state on load, no error state on run

Load: only loading | success. Error → infinite loading (no back button appears until snippet loads).  
Run: only running | success. Error → stuck spinner with no feedback.  
Delete: no loading state, no error state.

### MS-3 · EditorView — no error state on load, no error state on save

Edit load failure: blank form with no error message (see SF-6).  
Save failure: stuck Save button with no error (see SF-5).  
Validation error uses `alert()` — blocking, not styled, and particularly disruptive on Android (primary target).

### MS-4 · Playground — no error state after run failure

Only: running | success | idle. No error state (see SF-9).

### MS-5 · DetailView — no loading/error state for file tabs with missing content

```js
content: await fs.readFile(path.join(dir(id), name), 'utf-8').catch(() => '')
```

Missing source file silently renders as an empty code block. No indicator that the file is missing vs. genuinely empty.

---

## Improvements

Priority order: crash risks first, then silent failures with worst UX impact.

### 1 · Wrap POST /snippets in try/catch; roll back on failure

```js
router.post('/snippets', async (req, res) => {
  // ... validation ...
  const id = randomUUID()
  try {
    await fs.mkdir(dir(id), { recursive: true })
    await fs.writeFile(path.join(dir(id), 'meta.json'), JSON.stringify(meta, null, 2))
    await Promise.all(files.filter(f => validFilename(f.name)).map(f =>
      fs.writeFile(path.join(dir(id), f.name), f.content || '')
    ))
    res.status(201).json(meta)
  } catch (e) {
    console.error('create snippet failed', e)
    await fs.rm(dir(id), { recursive: true, force: true }).catch(() => {})
    res.status(500).json({ error: 'Failed to save snippet' })
  }
})
```

### 2 · Add `child.on('error')` to both spawn paths

```js
child.on('error', (err) => {
  clearTimeout(timer)
  res.json({ stdout: '', stderr: `Failed to run: ${err.message}`, exitCode: 1 })
})
```

### 3 · Fix the timeout/close race condition

```js
let responded = false
const timer = setTimeout(() => {
  if (responded) return
  responded = true
  child.kill()
  res.json({ stdout, stderr: 'Timeout (10s)', exitCode: 124 })
}, 10000)

child.on('close', (code) => {
  if (responded) return
  responded = true
  clearTimeout(timer)
  res.json({ stdout, stderr: runErr, exitCode: code })
})
```

### 4 · Add `.catch()` to `main()` and a global Express error middleware

```js
// server/index.js
main().catch(err => { console.error('startup failed', err); process.exit(1) })

// after all routes
app.use((err, req, res, next) => {
  console.error('unhandled error', err)
  res.status(500).json({ error: 'Internal server error' })
})
```

### 5 · Check `res.ok` in `api.js`

```js
const json = async (res) => {
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(`HTTP ${res.status}: ${text}`)
  }
  return res.json()
}
```

This ensures callers get a real rejection on HTTP errors, rather than silently getting error objects or throwing on JSON.parse of HTML.

### 6 · Add try/catch to all async view handlers; show error in UI

Pattern for all four handlers (`handleRun`, `handleSave`, `handleDelete`, `load`):

```js
const handleRun = async () => {
  setRunning(true)
  setRunOutput(null)
  setError(null)
  try {
    const out = await api.runSnippet(id, stdin)
    setRunOutput(out)
  } catch (e) {
    setError('Run failed. Check connection.')
  } finally {
    setRunning(false)
  }
}
```

`finally` guarantees loading/saving/running state always clears.

### 7 · Replace `alert()` in EditorView with inline error state

`alert()` on Android (Chrome WebView/PWA) blocks the UI thread and cannot be styled. Replace with a simple error string rendered near the Save button.

### 8 · Add `console.error` to every route catch block

At minimum: `console.error('[route] [operation] failed', { id }, err)`. Without this, production incidents are undiagnosable.

### 9 · Validate `title` server-side in POST and PUT handlers

The client validates it, but the server does not. A direct API call (or a client bug) can create snippets with empty titles.

### 10 · Use `execFile`/`spawn` instead of `exec` for compilation

`exec` passes the command through `/bin/sh`. While current filename validation prevents injection, the pattern is inherently fragile. `execFile` or `spawn` with an argv array does not involve a shell at all:

```js
// instead of exec(`g++ ${files.join(' ')} -o ${bin}`)
spawn('g++', [...files, '-o', bin])
```

### 11 · Add a `responded` guard + `updatedAt` null check in list sort

```js
.sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''))
```

Prevents a single corrupt meta.json from wiping the entire snippet list.
