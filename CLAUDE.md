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
| POST | /api/snippets/:id/run | g++ compile + exec |
| POST | /api/playground/run | compile code wrapped in main() + std headers |

Storage: `data/<uuid>/meta.json` + raw `.cpp`/`.h` files. No database.

## Dev

```bash
cd ~/docker/myapp && npm run dev
```

Single process — Express on 5174, Vite HMR active. Restart server for backend changes.

Tailscale HTTPS:
- **App URL:** `https://cachyos-nvme.tail5500ce.ts.net`
- Enable: `tailscale serve --bg http://localhost:5174`
- Disable: `tailscale serve --https=443 off`

## Docker

```bash
docker compose up --build   # prod build inside container
```

`./data:/app/data` bind mount — same files, no copy. Data at `~/docker/myapp/data/` on host.
Container needs g++: `apk add --no-cache g++ make` (already in Dockerfile).

## Conventions

- No comments unless WHY is non-obvious
- No premature abstraction
- Explain changes before making them — no silent rewrites
- Plain CSS, no framework
- No TypeScript
