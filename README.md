# CodeVault

Personal code snippet manager with in-browser execution. Runs in Docker, accessible from anywhere via Tailscale.

<!-- screenshot here -->

CodeVault stores C++, C, and Python snippets as plain files on disk. Each snippet can have multiple source files, tags, and notes. From the detail view or a scratch-pad playground, you can compile and run code directly in the browser and see stdout/stderr output. The app is a PWA, so it can be installed on Android and used offline for viewing.

## Features

- Create, edit, delete snippets with multiple source files
- Tag and notes fields per snippet
- Search across title, tags, and notes
- Filter list by tag
- Syntax highlighting in detail view (highlight.js)
- CodeMirror 6 editor with auto-indent, bracket matching, auto-close braces
- Run snippets (compile + execute) with optional stdin
- Playground scratch pad — wraps code in standard headers so you can skip boilerplate
- Save playground code as a new snippet
- Bearer token auth (optional)
- PWA — installable, works offline for browsing

## Tech Stack

- **Frontend:** React 19 + Vite 8, plain CSS, no routing or state library
- **Backend:** Express 5 wrapping Vite in middleware mode — single process, single port (5174)
- **Storage:** Flat files — `data/<uuid>/meta.json` + raw source files, no database
- **Code execution:** gcc / g++ / python3 inside the Alpine container
- **Deployment:** Docker Compose + Tailscale HTTPS

## Getting Started

### Prerequisites

- Docker + Docker Compose
- A Tailscale account (for remote access; local access works without it)

### Run

```bash
git clone <repo>
cd codevault
docker compose up --build
```

On first start the entrypoint will prompt you to authenticate Tailscale:

```bash
docker exec -it codevault tailscale login
```

After login the app is available locally at `http://localhost:5174` and over Tailscale HTTPS at `https://codevault.<tailnet>.ts.net`.

### Environment Variables

| Variable | Description | Default |
|---|---|---|
| `PORT` | HTTP port the server listens on | `5174` |
| `DATA_DIR` | Directory where snippet data is stored | `./data` |
| `NODE_ENV` | `development` runs Vite dev server with HMR; `production` serves pre-built `dist/` | `development` |
| `AUTH_TOKEN` | Optional bearer token. When set, all `/api` routes require `Authorization: Bearer <token>`. | _(disabled)_ |

### First Use

Open the app, tap **+** to create a snippet, give it a title, paste or write some code, and hit **Save**. From the detail view tap **Run** to compile and execute. Use the **Playground** tab for quick scratch-pad experiments.

## API Reference

| Method | Path | Description |
|---|---|---|
| GET | `/api/snippets` | List all snippets (metadata only, sorted by `updatedAt`) |
| GET | `/api/snippets/:id` | Get one snippet including all file contents |
| POST | `/api/snippets` | Create a snippet |
| PUT | `/api/snippets/:id` | Update a snippet |
| DELETE | `/api/snippets/:id` | Delete a snippet and all its files |
| POST | `/api/snippets/:id/run` | Compile and execute a snippet; accepts optional `stdin` |
| POST | `/api/playground/run` | Compile and run ad-hoc code wrapped in standard headers |

## Project Structure

```
├── server/
│   ├── index.js        # Express + Vite middleware setup, auth, startup
│   ├── routes.js       # All API route handlers
│   ├── executor.js     # compile/run logic — spawn, timeout, cleanup
│   └── languages.js    # Language definitions (C++, C, Python) and compiler args
├── src/
│   ├── App.jsx         # Root — tab/view state, navigation
│   ├── App.css         # All styles
│   ├── api.js          # Fetch wrappers for every API endpoint
│   ├── languages.js    # Client-side language metadata (labels, hljs names)
│   ├── components/
│   │   ├── CodeBlock.jsx      # highlight.js read-only display
│   │   ├── CodeEditor.jsx     # CodeMirror 6 editor wrapper
│   │   └── ConfirmDialog.jsx  # Modal confirm dialog
│   └── views/
│       ├── ListView.jsx    # Snippet list, search, tag filter
│       ├── DetailView.jsx  # Detail + run panel
│       ├── EditorView.jsx  # Create/edit form
│       └── Playground.jsx  # Scratch pad with per-language localStorage state
├── tests/
│   ├── integration/    # Supertest — snippets CRUD, run, playground
│   └── unit/           # Language registry, client language definitions
├── data/               # Bind-mounted volume — one UUID dir per snippet
├── Dockerfile          # Node 24 Alpine + gcc + g++ + python3 + tailscale
├── docker-compose.yml  # Dev config — bind-mounts repo, exposes 5174
└── entrypoint.sh       # Tailscale startup, node_modules check, server launch
```

## Code Execution

When you run a snippet or playground code, the server:

1. Reads the source files from disk (or writes playground code to `/tmp`)
2. **Compiles** with `g++` (C++), `gcc` (C), or skips compilation (Python)
3. **Executes** the binary or interpreter with optional stdin piped in

**Limits:**

| Limit | Value |
|---|---|
| Run timeout | 10 seconds |
| Compile timeout | 15 seconds |
| Virtual memory | 128 MB (`ulimit -v`) |
| Stdin | 64 KB max |
| Rate limit | 10 requests/min per IP |

On timeout the entire process group is killed (catches forked children). There is no filesystem sandboxing beyond what the container provides — code runs as the container user with access to the container filesystem.

## Development

```bash
# Start dev server (inside container — runs automatically via docker compose up)
npm run dev

# Run tests (must run inside Docker — uses Alpine gcc/g++ and musl libc)
docker compose --profile test run --rm test

# Lint
npm run lint

# Production build
docker compose up --build
# or inside container:
npm run build && npm start
```

Test files live in `tests/` and are picked up automatically by Vitest. No rebuild needed when editing tests or source — the test service bind-mounts the repo.

## License

MIT
