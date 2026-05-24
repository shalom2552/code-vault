## Setup

```
npm install && npm run dev   # dev port 5174
npm run build && npm start   # prod
npm test && npm run lint
docker compose up --build
```

## Architecture Decisions

- Execution: `spawn()` via `executor.js`, never `exec()`. Routes call `compileCode()`/`runCode()`. Detached; kill group on timeout. Shell: `ulimit -v 131072` + `ulimit -t 10`.
- Auth: bearer token on `/api/*` when `AUTH_TOKEN` set. `/api/health` open.
- Storage: filesystem at `DATA_DIR`. Dirs: `slugified_title_<8-hex>`. Write source before `meta.json`; delete partial dir on failure.
- Routing: no library. `App.jsx` state machine; nav via prop callbacks.
- State: props down from `App.jsx`. `ToastContext` for toasts. `localStorage` only for `code-font-size`.
- Styles: `App.css` only. No modules, no inline, no UI libs.
- Code display: CodeMirror for editing and read-only. `highlight.js` installed but unused.
- Run output: `OutputPanel` only. Never inline.
- Language defs: `server/languages.js` + `src/languages.js` — edit as a pair.

## Conventions

- `PascalCase.jsx` components, `camelCase.js` utils. `memo()` on leaves.
- Errors: `toast(msg,'error')` for users; `log.error()` on server.
- All API calls via `src/api.js`.
- Conventional commits. Pre-commit: lint-staged `eslint --max-warnings 0`.

## File Ownership (one agent at a time)

`package.json` · `src/App.jsx` · `src/App.css` · `server/languages.js`+`src/languages.js`

## Testing

Vitest + supertest. `tests/integration/*.test.js` · `tests/unit/*.test.js`. Real Express + real tmp fs, no mocks. 40 s timeout. Rate limiters skip when `VITEST=true`.

## Do Not

- Never `exec()` — `spawn()` with argv array.
- Never inline styles or UI libraries.
- Never `highlight.js` — CodeMirror only.
- Never Context for app state — props only.
- Never raw `fetch()` — use `src/api.js`.
- Never inline run output — use `OutputPanel`.
- Never compiler flags outside `ALLOWED_FLAGS` in `server/routes.js`.

## Updating This File

Significant decision or pattern change — update before committing.
