# CodeVault — Improvement Plan Summary

## Features

[must] [S] — Copy-code button in detail view (clipboard API, 1-tap)
[must] [M] — Full-text search: extend ?q= to match code file contents
[must] [S] — JSON export endpoint + download button in list header
[must] [L] — Desktop two-pane layout at ≥900px (list always visible)
[must] [M] — Replace highlight.js CodeBlock with read-only CodeMirror
[should] [S] — Add Bash language (no Dockerfile change, already in Alpine)
[should] [M] — Compiler flags per snippet (whitelisted, stored in meta.json)
[should] [S] — Pinned snippets: star icon, always sort to top
[should] [S] — Snippet duplication action in detail view
[should] [M] — Execution history: last 5 runs stored in meta.json
[should] [S] — Font size control (Aa button, 12–15px, localStorage)
[should] [S] — Language filter chips above snippet list
[nice] [S] — Sort options: Recent / Oldest / A–Z / Z–A (localStorage)
[nice] [tiny] — Show createdAt / updatedAt timestamps in detail view
[nice] [S] — Paste-from-clipboard button in new snippet editor

## UI/UX

[should] [S] — Loading skeletons (pure CSS shimmer, no library)
[should] [S] — Toast notifications: save/delete/copy/error feedback
[should] [S] — Keyboard shortcuts: / search, Ctrl+S save, Ctrl+Enter run, Esc back
[should] [M] — PWA offline cache: NetworkFirst for GET /api/snippets routes
[nice] [M] — Swipe-right to go back on mobile (avoid CodeMirror conflict)
[nice] [tiny] — Fix --muted contrast (#888), unify tag opacity, reduce FAB shadow
[nice] [tiny] — Empty state: icon + CTA when vault empty or search has no results

## Infrastructure / DX

[must] [tiny] — Backup script: scripts/backup.sh tars data/ to ~/backups/
[should] [tiny] — Docker healthcheck pointing at GET /api/health
[should] [S] — GitHub Actions CI: checkout + node 24 + npm test
[should] [tiny] — Env var docs: docs/env.md table of all server env vars
[nice] [S] — Structured logging in server/log.js (timestamps, INFO/ERROR)
[nice] [S] — Pre-commit hook: ESLint on staged files via lint-staged

## Architecture

[nice] [M] — Custom router hook: history.pushState + popstate for browser back
[nice] [L] — SQLite + FTS5 storage (only if grep search gets slow at 50+ snippets)
