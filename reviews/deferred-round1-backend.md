# Deferred: Frontend Contract Changes (Round 1 Backend)

These backend features are live but have no frontend UI yet.

## 1. Server-side full-text search (`?q=`)

`GET /api/snippets?q=<term>` now searches title, tags, notes, AND file contents server-side.

**Frontend change:** pass `q` param to the API instead of filtering client-side in `ListView`. Eliminates the need to download all snippet file contents on the list view.

## 2. JSON export

`GET /api/export` returns all snippets as a JSON array with inline file contents.

**Frontend change:** add an Export button (e.g. in a settings panel or header) that fetches `/api/export` and triggers a `<a download>` with `application/json`.

## 3. Bash language

Backend now accepts `language: "bash"` with `ext: .sh`, executed via `/bin/sh`.

**Frontend change:**
- Add `bash` to the language selector in `EditorView`
- Add CodeMirror shell/bash syntax mode if desired (optional)
- In `Playground`, include bash in the language dropdown

## 4. Pinned snippets

- `meta.json` gains `pinned: boolean` field
- `GET /api/snippets` returns pinned items first
- `PATCH /api/snippets/:id/pin` toggles pin (returns `{ pinned: bool }`)
- `POST`/`PUT` accept `pinned` field

**Frontend change:**
- Show pin indicator (e.g. pin icon) in `ListView` for pinned snippets
- Add pin/unpin button in `DetailView` (calls `PATCH /:id/pin`, updates local state)
- `EditorView` may expose a pin checkbox on create/edit

## 5. Execution history

After each run, the backend appends to `meta.runs[]` (last 5 entries). Each entry: `{ stdout, stderr, exitCode, timestamp }`. Returned in `GET /api/snippets/:id`.

**Frontend change:** add a "Run history" section in `DetailView` showing the last runs (collapsible, oldest at bottom). Requires no additional API calls — history is in the detail response.

## 6. Compiler flags

- `meta.json` gains `compilerFlags: string[]`
- Whitelist: `-O0 -O1 -O2 -O3 -Wall -Wextra -Werror -std=c++17 -std=c++20 -std=c++23 -std=c11 -std=c99 -lm -lpthread -g -DDEBUG`
- `POST`/`PUT` validate and store flags; rejected flags return `400`
- Flags applied at compile time for `cpp`/`c` snippets

**Frontend change:** add a multi-select or tag-style input for compiler flags in `EditorView` (only shown for `cpp`/`c` languages). Provide the whitelist as a constant so the UI can enumerate valid options.

## 7. Title / notes length limits

`POST`/`PUT` now enforce:
- Title: max 100 characters
- Notes: max 5000 characters

**Frontend change:** add `maxLength` or client-side validation in `EditorView` to surface errors before submit.

## 8. Health endpoint

`GET /api/health` returns `{ status: "ok" }`. Exempt from `AUTH_TOKEN` check.

**Frontend change:** none required. Useful for Docker healthcheck or uptime monitoring.
