# CppVault

Personal C++ snippet manager + code runner. Runs in Docker, accessed from Android via Tailscale.

## Stack

- React 19 + Vite 8 (frontend)
- Express 5 wrapping Vite in middleware mode — one process, one port (5174), HMR in dev
- vite-plugin-pwa — PWA + service worker (devOptions disabled to avoid caching issues)
- highlight.js — read-only C++ syntax highlighting (detail view)
- CodeMirror 6 via @uiw/react-codemirror — editor with auto-indent, bracket matching, auto-close braces
- No routing lib, no state lib — plain useState/useEffect

## Architecture

```
src/
  App.jsx               # thin shell: tab + view state, nav
  App.css               # all styles
  api.js                # fetch wrappers (api.listSnippets, api.runSnippet, etc.)
  components/
    CodeBlock.jsx       # highlight.js display-only
    CodeEditor.jsx      # CodeMirror 6 reusable editor
  views/
    ListView.jsx        # snippet list, search, tag filter
    DetailView.jsx      # detail + run panel
    EditorView.jsx      # create/edit with CodeEditor
    Playground.jsx      # scratch pad, wraps code in main() server-side
server/
  index.js              # Express + Vite middleware, prod serves dist/
  routes.js             # all API handlers
data/                   # bind-mounted volume — UUID dirs with meta.json + .cpp files
```

## API

| Method | Path | Action |
|--------|------|--------|
| GET | /api/snippets | list all |
| GET | /api/snippets/:id | detail + file contents |
| POST | /api/snippets | create |
| PUT | /api/snippets/:id | update |
| DELETE | /api/snippets/:id | rm -rf |
| POST | /api/snippets/:id/run | compile + exec (language from meta) |
| POST | /api/playground/run | compile code wrapped in headers + std includes |

Storage: `data/<uuid>/meta.json` + raw source files. No database. `meta.json` includes `language` field (`cpp` or `c`, default `cpp`).

## Dev

Everything runs inside Docker. `~/docker/myapp` on host is bind-mounted into the container. Claude Code runs on host and edits files there; Docker picks up changes via the mount.

```bash
# inside the container
npm run dev
```

Single process — Express on 5174, Vite HMR active. Restart container for backend changes.

Tailscale HTTPS:
- **App URL:** `https://cachyos-nvme.tail5500ce.ts.net`
- Enable: `tailscale serve --bg http://localhost:5174`
- Disable: `tailscale serve --https=443 off`

## Docker

```bash
docker compose up --build   # prod build inside container
```

`./data:/app/data` bind mount — same files, no copy. Data at `~/docker/myapp/data/` on host.
Container needs gcc + g++: `apk add --no-cache gcc g++ make` (already in Dockerfile).

## Tests

Tests must run inside Docker — app uses Alpine + musl libc + Alpine's gcc/g++. Running on host gives wrong compiler and libc.

```bash
docker compose --profile test run --rm test
```

The `test` service mounts source live (always current) and preserves Alpine node_modules from the image. No rebuild needed when editing tests or source — only rebuild when adding npm dependencies.

## Conventions

- No comments unless WHY is non-obvious
- No premature abstraction
- Explain changes before making them — no silent rewrites
- Plain CSS, no framework
- No TypeScript
