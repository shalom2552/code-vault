## Setup

```
npm install && npm run dev   # dev port 5174
npm run build && npm start   # prod
npm test && npm run lint
docker compose up --build
```

## Architecture

- Execution: `spawn()` via `server/executor.js`. Detached process group; SIGKILL on timeout kills grandchildren. Shell: `ulimit -v 131072` (128 MB) + `ulimit -t 29` (CPU sec). Output capped 1 MB; kills process on cap.
- Storage: `DATA_DIR` filesystem. Dirs: `slugified_title_<8-hex>`. Write source files before `meta.json`; rollback (rm dir) on failure.
- Auth: `/api/health` pre-auth in `server/index.js`. All other `/api/*` auto-guarded when `AUTH_TOKEN` set.
- State: props down from `App.jsx`. `ToastContext` only exception. `localStorage` only for `code-font-size`.
- Styles: `App.css` only. No modules, no inline, no UI libs.

## Language Files (always edit as a pair)

`server/languages.js` — compile argv + runner argv.  
`src/languages.js` — client labels, editor defaults, `playgroundDefault`.

Gotchas:
- Java: `srcFile = 'Main.java'` (capital M); runner: `java -cp <dir> Main`
- PHP: runner binary is `php83`, not `php`
- TypeScript: runner is `tsx`, not `ts-node`
- `hljsLang` in client file exists but `highlight.js` is never called — don't add hljs rendering

## Testing

Real Express + real tmp fs, no mocks. Rate limiters skip when `VITEST=true`.  
**Timeout constraint**: executor `TIMEOUT_MS = 30000`. Test `EXECUTOR_TIMEOUT` must be > 30000; global `testTimeout` must be > `EXECUTOR_TIMEOUT`. (currently 35000 / 40000)

- Run `npm test` before committing any change
- If a test fails, fix it — never skip or delete a passing test
- If you change behavior that a test covers, update the test
- Never use --forceExit to mask open handle issues

## File Ownership (one agent at a time)

`package.json` · `src/App.jsx` · `src/App.css` · `server/languages.js`+`src/languages.js`

## Do Not

- Never `exec()` — `spawn()` with argv array from `languages.js`
- Never inline styles or UI libraries
- Never `highlight.js` for rendering — CodeMirror only
- Never React Context for app state — props only (`ToastContext` is the only exception)
- Never raw `fetch()` — `src/api.js`
- Never inline run output — `OutputPanel`
- Never compiler flags outside `ALLOWED_FLAGS` in `server/routes.js`
