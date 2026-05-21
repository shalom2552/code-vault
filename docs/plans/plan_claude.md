# CodeVault — Next Round Improvement Plan

**Date:** 2026-05-20  
**Scope:** Round 2 after security/error-handling/executor overhaul is complete.  
**Reviewer:** Read all source files, all tests, all prior reviews before writing this.

---

## Codebase Snapshot (baseline)

| Thing | State |
|---|---|
| Languages | C++, C, Python |
| Storage | Filesystem — UUID dirs, meta.json + raw files |
| Views | ListView, DetailView, EditorView, Playground |
| Navigation | Manual VIEWS state machine — no router |
| Styling | Plain CSS, Outfit font, dark-only, 680px max-width |
| Editor | CodeMirror 6 (autoHeight in forms, fixed in playground) |
| Viewer | highlight.js — read-only, no line numbers |
| Auth | Optional bearer token via AUTH_TOKEN env |
| Tests | Vitest integration (executor, CRUD, playground) + unit (language registry) |
| PWA | Manifest + vite-plugin-pwa, service worker disabled in dev |

Real snippets currently stored: sin LUT, singleton pattern, time utils, etc. — clearly embedded/systems C++. That context shapes priorities below.

---

## A. MISSING FEATURES YOU DON'T KNOW YOU NEED

### A1. Copy-Code Button in Detail View

**What:** One-click button in the code block header to copy the visible file's content to clipboard.

**Why it matters:** You read a snippet on your phone, you want to paste it somewhere. Right now you have to long-press → select all → copy inside the viewer. That's 5 taps. This is a daily paper cut.

**Effort:** Small  
**Priority:** Must-have  
**Dependencies:** None

---

### A2. Keyboard Shortcuts

**What:** A small, always-active key handler for the most common actions:
- `/` — focus search input (from list view)
- `Ctrl+S` / `Cmd+S` — save (in editor)
- `Ctrl+Enter` / `Cmd+Enter` — run (in detail + playground)
- `Escape` — back/cancel (from detail, editor)
- `n` — new snippet (from list)

**Why it matters:** On desktop you're switching between this app and your editor constantly. Mouse navigation is slow.

**Effort:** Small  
**Priority:** Should-have  
**Dependencies:** None

---

### A3. Full-Text Search in Code Content

**What:** Extend the search filter to also match against file contents, not just title/tags/notes. Currently `ListView.jsx:99-107` only searches `s.title`, `s.tags`, `s.notes`.

**Why it matters:** You remember writing `sin_table` somewhere but not what snippet it's in. The title was "Sin LUT and Taylor" — but what if you didn't name it that? Full-text search is the killer feature for a vault.

**Implementation path A (no DB):** `GET /api/snippets` already returns metadata only. Add `GET /api/snippets?q=<term>` server-side search that reads each snippet dir's files and greps. Slow at scale, fine for <200 snippets.

**Implementation path B (SQLite):** Index file contents on write, full-text search via FTS5. See D2.

**Effort:** Medium (path A), Large (path B)  
**Priority:** Must-have  
**Dependencies:** None (path A), D2 (path B)

---

### A4. Compiler Flags Per Snippet

**What:** Allow setting compile flags in the snippet metadata — e.g., `-O2 -Wall -std=c++20 -lm`. Stored in `meta.json` as a `compileFlags` array. Used by the executor when building.

**Why it matters:** You're writing embedded/systems code. You care about `-O2`. You write math code that needs `-lm`. Currently everything compiles with bare `g++ file.cpp -o bin` — no optimization, no standards, no extra libs.

**Effort:** Medium  
**Priority:** Should-have  
**Dependencies:** Needs executor validation to whitelist safe flags (no `-o`, no `$(...)`)

---

### A5. Snippet Duplication

**What:** "Duplicate" action in context menu / detail view. Creates a new snippet with title "Copy of X", same files, same language, same tags, no notes.

**Why it matters:** You have a singleton pattern snippet. You want to start a new variation. Right now: open detail → copy code → new snippet → paste. Four navigation steps. Duplication is one tap.

**Effort:** Small  
**Priority:** Should-have  
**Dependencies:** None

---

### A6. Pinned/Starred Snippets

**What:** A boolean `pinned` field in meta.json. Star icon in list view. Pinned snippets always sort to top, regardless of updatedAt.

**Why it matters:** Your sin LUT and singleton snippets are reference material you open constantly. They keep getting buried as you add newer snippets. Pinning is the simplest possible solution.

**Effort:** Small  
**Priority:** Should-have  
**Dependencies:** None

---

### A7. Execution History

**What:** Store the last N (e.g., 5) run results in `meta.json` as `runHistory: [{ stdin, stdout, stderr, exitCode, ranAt }]`. Show a collapsible "History" section in DetailView below the current output.

**Why it matters:** You run a snippet, see the output, scroll away, come back — output is gone. You tweak the code, re-run — did it improve? You have no reference. Execution history gives you a before/after without copy-pasting into a notepad.

**Effort:** Medium  
**Priority:** Should-have  
**Dependencies:** None

---

### A8. JSON Export / Backup

**What:** `GET /api/export` returns a JSON blob: `{ exportedAt, version: 1, snippets: [{ meta, files: [{ name, content }] }] }`. A UI button in the list header ("Export"). Downloads as `codevault-backup-YYYY-MM-DD.json`.

**Why it matters:** Your data is on a self-hosted Docker container. Bind-mounted to `~/docker/myapp/data/`. If that volume gets nuked, your snippets are gone. A one-click export gives you a recoverable backup you can email to yourself or commit to a private repo.

**Effort:** Small (server route + download trigger)  
**Priority:** Must-have  
**Dependencies:** None

---

### A9. Sort Options

**What:** A sort control in the list header (dropdown or cycling button): Recent (default, by updatedAt desc), Oldest, A→Z, Z→A. Persisted in localStorage.

**Why it matters:** As the vault grows, alphabetical sort is sometimes faster for scanning than recency. It's a quality-of-life detail that takes one afternoon to build.

**Effort:** Small (client-side, data already loaded)  
**Priority:** Nice-to-have  
**Dependencies:** None

---

### A10. More Languages

**What:** Add to both `server/languages.js` and `src/languages.js`:
- **Bash** (already in Alpine — `bash main.sh`, no compile step)
- **Lua** (requires `apk add lua5.4` in Dockerfile)

Do NOT add Java, Go, Rust — they'd bloat the image and compilation times. Bash and Lua are tiny and immediately useful for embedded/scripting contexts.

**Why it matters:** A non-trivial fraction of useful snippets are shell scripts or Lua scripts (especially for embedded systems work with scripting interfaces). Right now you can't store them runnable.

**Effort:** Small (Bash — already installed), Medium (Lua — Dockerfile change + test)  
**Priority:** Should-have (Bash), Nice-to-have (Lua)  
**Dependencies:** Docker rebuild for Lua

---

### A11. Line Numbers in Code Viewer

**What:** The read-only `CodeBlock.jsx` (highlight.js) currently shows no line numbers. Add them — either via highlight.js's lineNumbers plugin or by switching the viewer to a read-only CodeMirror instance.

**Why it matters:** You're reading a 60-line sin LUT implementation. The compiler says "error on line 34." You're counting manually. Line numbers are table stakes for a code viewer.

**Effort:** Small (highlight.js approach), Medium (CodeMirror readonly approach — better but more deps)  
**Priority:** Must-have  
**Dependencies:** None

---

### A12. Creation Date in Detail View

**What:** Show `createdAt` and `updatedAt` as small muted timestamps in the detail view header. Already in meta.json, just never surfaced.

**Why it matters:** "Did I write this before or after the refactor?" Currently no way to know.

**Effort:** Tiny  
**Priority:** Nice-to-have  
**Dependencies:** None

---

### A13. Quick Import from Clipboard

**What:** A button in the "New Snippet" editor view: "Paste from clipboard" — reads clipboard, populates the first file's content. If the clipboard contains a URL (GitHub raw link), optionally fetch it.

**Why it matters:** You copy code from a Stack Overflow answer or your own editor. You open CodeVault, tap New, tap Paste — done. Currently: New → focus editor → long-press → paste. The Paste button eliminates the precision-tap-in-editor step, which is annoying on mobile.

**Effort:** Small (clipboard API is async, needs `navigator.clipboard.readText()`)  
**Priority:** Nice-to-have  
**Dependencies:** Requires HTTPS context (already satisfied via Tailscale)

---

### What NOT to Build

| Feature | Why Not |
|---|---|
| GitHub Gist sync | You're Tailscale-only, single user. Complexity not worth it. |
| Sharing / public links | Personal tool. No multi-user. |
| Snippet versioning/history | Git is right there if you want versioning. |
| Vim keybindings in editor | CodeMirror supports it via `@codemirror/vim`. Add if you want it — medium effort — but not critical for most people. |
| Intellisense / LSP | Requires a language server in the container. Significant complexity. Out of scope. |
| Folders / nested tags | You have 8 snippets. Tags are enough. Revisit at 100+. |
| Markdown export | Your snippets are code, not documentation. |

---

## B. UI/UX OVERHAUL

### B1. Desktop Layout: Two-Pane Mode

**Current state:** `max-width: 680px; margin: 0 auto` — a phone-width column centered on a 1440px monitor. Massive dead space on both sides.

**What to do:** At `min-width: 900px` (desktop breakpoint), switch to a two-pane layout:
- **Left pane (300px fixed):** Snippet list + search + tags — scrollable
- **Right pane (flex: 1):** Detail view, or editor, or playground — takes remaining space
- **Bottom nav → Left sidebar:** At desktop width, the two nav items become a sidebar column with larger tap targets and labels.

This is the pattern used by every successful snippet manager: SnippetsLab, MassCode, Snibox. It works because the list and the detail are both permanently visible.

**Design direction — specific choices:**

```
Mobile (< 900px):
  Bottom nav stays. Single-column views. Current behavior.

Desktop (≥ 900px):
  ┌─────────────────┬────────────────────────────────────┐
  │  CodeVault  ●   │  Sin LUT and Taylor                │
  │  ─────────────  │  ─────────────────────────────────  │
  │  🔍 Search      │  [lut]           C++   Edit   Del  │
  │                 │                                     │
  │  [All] [lut]    │  sin_lut.cpp ▾                     │
  │  [Time]         │  1  #include "sin_lut.hpp"          │
  │  ─────────────  │  2  #include <cmath>                │
  │  📌 Sin LUT...  │  3  ...                             │
  │  Sin LUT and T  │                                     │
  │  ─────────────  │  stdin ___________  [▶ Run]         │
  │  Get curr time  │                                     │
  │  ─────────────  │  exit 0                             │
  │  Singleton...   │                                     │
  │  ─────────────  │                                     │
  │                 │                                     │
  │  ⊞ Snippets  ▶  │                                     │
  └─────────────────┴────────────────────────────────────┘
```

**Effort:** Large  
**Priority:** Must-have (the app is genuinely bad on desktop right now)  
**Dependencies:** None, but do this before adding new views

---

### B2. Code Viewer: Switch to CodeMirror Read-Only

**Current state:** `CodeBlock.jsx` uses highlight.js. No line numbers. No copy button. The editor already uses CodeMirror — having two different code display systems is technical debt.

**What to do:** Replace highlight.js `CodeBlock` with a read-only CodeMirror 6 instance. Configure:
- `EditorState.readOnly.of(true)`
- Line numbers on
- Same oneDark theme as editor
- Copy button floating in top-right corner of code block
- Word-wrap toggle button (wrapping is off by default)

**Why better than adding highlight.js line numbers:** CodeMirror read-only gives you line numbers, copy, consistent theming, and potential future features (goto line, find-in-file) for free. highlight.js can be removed entirely, reducing bundle size.

**Effort:** Medium  
**Priority:** Must-have  
**Dependencies:** A11 (line numbers) is subsumed by this

---

### B3. Loading Skeletons

**Current state:** Loading states are "Loading..." text. Detail view shows nothing until fetch completes.

**What to do:** Replace every "Loading..." with a skeleton that matches the layout:
- List view: 3-4 skeleton cards (gray animated blocks at title height + meta height)
- Detail view: skeleton header + skeleton code block

**Implementation:** Pure CSS animation — `@keyframes shimmer` with a moving gradient. No library needed.

**Effort:** Small  
**Priority:** Should-have (makes the app feel faster on mobile Tailscale connections)  
**Dependencies:** None

---

### B4. Toast Notifications

**Current state:** Errors show as `error-banner` elements inline in the view. Success actions (save, delete) give no feedback except navigation.

**What to do:** A `Toast` component that slides in from the bottom (above the bottom nav on mobile, bottom-right on desktop):
- Success: "Snippet saved", "Snippet deleted"
- Error: "Save failed — check connection"
- Auto-dismiss after 3s
- Manual dismiss via ✕

Single `useToast` hook at `App.jsx` level, passed down or via a simple context.

**Effort:** Small  
**Priority:** Should-have  
**Dependencies:** None

---

### B5. Color Palette — Keep and Refine

**Current palette:** Black background (`#0d0d0d`), surface `#161616`, accent `#b8f542` (lime-green), danger `#f54242`.

**Verdict:** Keep it. The lime-on-black is distinctive and readable. It's the right aesthetic for a developer tool. The issue isn't the palette — it's that it's applied inconsistently:

- `card-tag` uses `var(--accent)` at 0.9 opacity — inconsistent with tags in `detail-tags` at full opacity
- `.muted` (`#555`) is too dark for placeholder text (fails WCAG AA on `#161616` surface)
- The FAB's box-shadow at `rgba(184, 245, 66, 0.3)` is overdone on dark backgrounds

**Fixes:**
- `--muted: #666` → `#888` for placeholder text contrast
- Unify tag color to `var(--accent)` at full opacity everywhere
- FAB shadow: `0 2px 12px rgba(184, 245, 66, 0.2)` (more subtle)

**Effort:** Tiny  
**Priority:** Nice-to-have  
**Dependencies:** None

---

### B6. Typography and Font Size Controls

**Current state:** `font-size: 13px` hardcoded everywhere in code display. On a phone at arm's length, 13px monospace is borderline unreadable.

**What to do:**
- Persist a `codeFontSize` preference in localStorage: `12 | 13 | 14 | 15 | 16`
- A `Aa` button in the detail view and playground header cycles through sizes
- Applied to `.cm-editor`, `.code-block code`, `.run-stdout`, `.run-stderr` via a CSS custom property `--code-font-size`

**Effort:** Small  
**Priority:** Should-have (mobile reading pain point)  
**Dependencies:** None

---

### B7. Swipe Navigation on Mobile

**What:** On mobile, swipe right → go back (from detail view, editor view). Detected via touch events on the main content area, not the CodeMirror editor.

**Why:** Without browser back (PWA standalone mode), you depend entirely on the ← button. Swipe-back is the mobile native pattern.

**Effort:** Medium (needs careful touch handling to not conflict with horizontal code scroll)  
**Priority:** Nice-to-have  
**Dependencies:** None

---

### B8. Empty State Improvements

**Current:** "No snippets yet" centered text. Nothing else.

**What:** When the vault is empty, show:
- A code-style ASCII art vault icon (or the existing SVG icons)
- "Your vault is empty"
- "Add your first snippet →" button styled like the FAB (accent color)

When search returns no results:
- "No matches for '[term]'" 
- "Clear search" link

**Effort:** Tiny  
**Priority:** Nice-to-have  
**Dependencies:** None

---

### B9. PWA: Offline Support

**Current state:** `vite-plugin-pwa` is configured with `registerType: 'autoUpdate'` but `devOptions.enabled: false`. The service worker runs in production but only caches static assets. API calls fail offline.

**What to do:** Add a workbox `NetworkFirst` strategy for API calls, with a fallback cache for `GET /api/snippets` and `GET /api/snippets/:id`. Read-only offline access — you can view snippets you've opened before, but can't run or edit.

**Why:** You're accessing via Tailscale. Tailscale can drop. If you're looking at your phone for a reference while offline, the current app shows a blank screen. Offline cache gives you a read-only view.

**Effort:** Medium (workbox config is finicky)  
**Priority:** Should-have  
**Dependencies:** Understand Tailscale's effect on service worker scope — may need `tailscale serve` caching headers tweaked

---

## C. DEVELOPER EXPERIENCE & INFRASTRUCTURE

### C1. docker-compose.yml: Add Healthcheck

**Current state:** No healthcheck. If the Node server crashes, Docker marks the container as still running.

```yaml
healthcheck:
  test: ["CMD", "wget", "-qO-", "http://localhost:5174/api/snippets"]
  interval: 30s
  timeout: 5s
  retries: 3
```

**Effort:** Tiny  
**Priority:** Should-have  
**Dependencies:** None

---

### C2. Automated Backup Script

**What:** A shell script `scripts/backup.sh`:
```bash
#!/bin/sh
# Run from host: ./scripts/backup.sh
DEST=~/backups/codevault-$(date +%Y%m%d-%H%M).tar.gz
tar -czf "$DEST" ~/docker/myapp/data/
echo "Backup: $DEST"
```

And a cron entry (documented in README) to run it weekly.

**Why:** Right now the bind-mounted `data/` directory has no automated backup. One `docker compose down -v` (by accident) and it's gone.

**Effort:** Tiny  
**Priority:** Must-have  
**Dependencies:** None

---

### C3. Environment Variable Documentation

**Current state:** The env vars `AUTH_TOKEN`, `PORT`, `DATA_DIR`, `NODE_ENV` are scattered across `server/index.js` with no single reference document. `docker-compose.yml` only declares `NODE_ENV`.

**What:** A `docs/env.md` with a table of all env vars, their defaults, and what happens if unset.

**Effort:** Tiny  
**Priority:** Should-have  
**Dependencies:** None

---

### C4. GitHub Actions CI

**What:** A `.github/workflows/test.yml` that runs the test suite on every push. Since the tests compile real C/C++, the action needs `gcc`/`g++`:

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 24 }
      - run: npm ci
      - run: npm test
```

Ubuntu runners already have `gcc`. Python3 is also present. This matches the Alpine environment closely enough for the integration tests.

**Why:** You currently have no safety net on push. A test-breaking refactor only shows up when you remember to run `docker compose --profile test run --rm test`.

**Effort:** Small  
**Priority:** Should-have  
**Dependencies:** Repo needs to be on GitHub (it appears to be — git user is shalom2552)

---

### C5. Structured Logging

**Current state:** Logging is `console.error('[routes] verb path failed', {id}, e)`. That's fine, but there's no timestamp, no log level, no request ID. Production diagnosis is harder than it needs to be.

**What:** A tiny logger module `server/log.js`:
```js
const log = {
  info: (...args) => console.log(new Date().toISOString(), '[INFO]', ...args),
  error: (...args) => console.error(new Date().toISOString(), '[ERROR]', ...args),
}
export default log
```

Replace all `console.error` calls with `log.error`. For a personal self-hosted app, this is enough. No Winston, no Pino.

**Effort:** Small  
**Priority:** Nice-to-have  
**Dependencies:** None

---

## D. TECHNICAL DEBT & ARCHITECTURE EVOLUTION

### D1. Should You Migrate to TypeScript?

**Verdict: No. Not yet.**

You have 9 source files. The codebase is small enough that JSDoc types on the 2-3 most complex interfaces (the snippet meta shape, the executor result shape) would give you 80% of the benefit at 0% of the migration cost. If the codebase doubles in size or you start having type-related bugs, revisit.

If you want type safety in the API layer specifically, add JSDoc `@typedef` for `SnippetMeta` in `server/routes.js` and `@param` annotations on `api.js` — that's it.

---

### D2. Should Storage Migrate to SQLite?

**Verdict: Yes, but only when you need full-text search.**

Current filesystem storage is adequate. It's simple, transparent, survives power loss, easy to backup, and your test suite works against it directly. The only thing it can't do well is full-text search across file contents (A3).

**Migration trigger:** If you implement A3 via server-side grep (path A), and the vault grows past ~50 snippets making it feel slow, that's when to migrate to SQLite + FTS5. The schema is trivial:

```sql
CREATE TABLE snippets (id TEXT PRIMARY KEY, meta TEXT);  -- meta JSON blob
CREATE TABLE files (snippet_id TEXT, name TEXT, content TEXT);
CREATE VIRTUAL TABLE files_fts USING fts5(content, content_id UNINDEXED);
```

**Effort:** Large (migration script, adapter layer, test changes)  
**Priority:** Nice-to-have  
**Dependencies:** A3 (full-text search need)

---

### D3. Should You Adopt React Router?

**Verdict: No. Fix the current state machine instead.**

The VIEWS enum approach in `App.jsx` works. The bug risk is prop drilling callbacks (`onSave`, `onBack`, `onEdit`, etc.) through 2 levels. If you add 2 more top-level views (settings, export), this will start to hurt.

**Better intermediate step:** A simple custom router hook that wraps the VIEWS state machine, adds browser back-button support (`history.pushState`), and supports deep-linking for direct snippet URLs (`/#/<id>`). This gives you 90% of React Router's benefits with zero new dependencies.

**Effort:** Medium  
**Priority:** Nice-to-have  
**Dependencies:** Wanted for B7 (swipe back) and desktop two-pane layout

---

### D4. Should You Use a Component Library?

**Verdict: No.**

Your hand-rolled components are clean and match your design system exactly. You have CodeMirror for the editor and highlight.js (or CodeMirror read-only per B2) for the viewer. The CSS is well-organized in a single file. Adding Radix/shadcn/etc. would introduce a dependency that imposes its own design opinions on a codebase where you already have opinionated choices.

The one genuine gap: **no animation/transition system**. Consider adding `@keyframes` for the toast (B4), the loading skeleton (B3), and view transitions. That's pure CSS — no library needed.

---

### D5. State Management

**Verdict: Not needed yet.**

The prop drilling is shallow (2 levels max). The state is per-view with no cross-view shared state except navigation. `useState` at `App.jsx` is the right call.

The only place this might bite you: if you add a global "pinned snippets" list or a "current font size" preference that multiple views need. When that happens, use a single `useContext` + `useReducer` at the `App.jsx` level. No Zustand, no Redux.

---

## Priority Summary Table

| ID | Feature | Effort | Priority | Depends |
|---|---|---|---|---|
| A1 | Copy-code button | S | Must | — |
| A2 | Keyboard shortcuts | S | Should | — |
| A3 | Full-text code search | M | Must | — |
| A4 | Compiler flags | M | Should | executor validation |
| A5 | Snippet duplication | S | Should | — |
| A6 | Pinned snippets | S | Should | — |
| A7 | Execution history | M | Should | — |
| A8 | JSON export | S | Must | — |
| A9 | Sort options | S | Nice | — |
| A10 | Bash language | S | Should | — |
| A11 | Line numbers viewer | subsumed by B2 | — | B2 |
| A12 | Timestamps in detail | Tiny | Nice | — |
| A13 | Paste from clipboard | S | Nice | HTTPS (done) |
| B1 | Desktop two-pane layout | L | Must | — |
| B2 | CodeMirror read-only viewer | M | Must | — |
| B3 | Loading skeletons | S | Should | — |
| B4 | Toast notifications | S | Should | — |
| B5 | Color palette refinement | Tiny | Nice | — |
| B6 | Font size control | S | Should | — |
| B7 | Swipe navigation | M | Nice | — |
| B8 | Empty state | Tiny | Nice | — |
| B9 | PWA offline cache | M | Should | — |
| C1 | Healthcheck | Tiny | Should | — |
| C2 | Backup script | Tiny | Must | — |
| C3 | Env docs | Tiny | Should | — |
| C4 | GitHub Actions CI | S | Should | — |
| C5 | Structured logging | S | Nice | — |
| D2 | SQLite storage | L | Nice | A3 |
| D3 | Custom router hook | M | Nice | — |

**Must-have batch:** A1, A3, A8, B1, B2, C2  
**Should-have batch:** A2, A4, A5, A6, A7, A10, B3, B4, B6, B9, C1, C3, C4  
**Nice-to-have batch:** Everything else

---

## Multi-Agent Implementation Strategy

### Phase 1: Parallel Read-Only Review Agents

Five agents, each writing to `reviews/round2/`, read-only, no code changes.

---

#### Agent R2-1: Feature Gap Review

```
You are a read-only code reviewer. Do not change any files.

Read the entire CodeVault codebase:
  src/App.jsx, src/App.css, src/api.js, src/index.css, src/main.jsx
  src/views/ListView.jsx, src/views/DetailView.jsx, src/views/EditorView.jsx, src/views/Playground.jsx
  src/components/CodeBlock.jsx, src/components/CodeEditor.jsx, src/components/ConfirmDialog.jsx
  src/languages.js
  server/index.js, server/routes.js, server/executor.js, server/languages.js
  package.json, docker-compose.yml, Dockerfile, entrypoint.sh, vite.config.js
  data/ (read one or two meta.json files to understand the real data model)

Then produce a feature gap analysis and write it to reviews/round2/r2-01-features.md.

For each missing feature you identify, write:
- Feature name
- What user workflow it enables
- How hard it is to add (S/M/L, roughly how many files change)
- Whether it requires backend changes, frontend changes, or both
- Any security considerations if it involves execution or storage

Focus on features a SINGLE DEVELOPER uses daily for storing/running C++/C/Python snippets.
Do not suggest multi-user features, sharing, or social features.

Be concrete. Name specific files and line numbers where the gap exists in the current code.

Write to: reviews/round2/r2-01-features.md
```

---

#### Agent R2-2: UI/UX and Responsive Layout Review

```
You are a read-only UI/UX reviewer. Do not change any files.

Read the entire CodeVault frontend:
  src/App.jsx, src/App.css, src/index.css
  src/views/ListView.jsx, src/views/DetailView.jsx, src/views/EditorView.jsx, src/views/Playground.jsx
  src/components/CodeBlock.jsx, src/components/CodeEditor.jsx, src/components/ConfirmDialog.jsx
  index.html, vite.config.js, public/ directory

Context: This is a PWA accessed from an Android phone via Tailscale AND from desktop browsers.
Current screen width constraint: max-width 680px centered. On desktop, this leaves huge dead margins.

Audit the following and write findings to reviews/round2/r2-02-ux.md:

1. RESPONSIVE LAYOUT
   - Is the layout mobile-only or does it use desktop space?
   - Describe what a desktop two-pane layout would look like and what CSS breakpoint to use.
   - List all views that need layout changes at desktop width.

2. NAVIGATION ARCHITECTURE
   - Is the bottom nav appropriate for both mobile and desktop?
   - What changes at >= 900px?
   - Does the absence of browser back-button support matter in PWA mode?

3. CODE DISPLAY QUALITY
   - CodeBlock.jsx uses highlight.js. Does it have line numbers? Copy button? Word wrap?
   - CodeEditor.jsx uses CodeMirror. What's the current config (line numbers, theme, features)?
   - Is there a case for unifying on CodeMirror for both display and editing?

4. VISUAL DESIGN
   - Rate the color palette on: contrast, consistency, accessibility.
   - Identify any hardcoded values that should be CSS variables.
   - Note any components with inconsistent spacing or sizing.

5. MOBILE-SPECIFIC
   - Is the playground usable on a small screen? (code editor + output compete for space)
   - Touch targets: any below 44px?
   - Are there loading states that feel jarring?

6. MICRO-INTERACTIONS
   - What transitions/animations exist (if any)?
   - Where would a skeleton loader improve perceived performance?
   - Is there toast/feedback for successful actions (save, delete)?

For each issue: file:line, severity (critical/major/minor), and a concrete fix recommendation.

Write to: reviews/round2/r2-02-ux.md
```

---

#### Agent R2-3: Code Execution and Language Extension Review

```
You are a read-only systems reviewer. Do not change any files.

Read the execution-related files:
  server/executor.js
  server/languages.js
  server/routes.js (focus on /run and /playground/run handlers)
  src/languages.js
  src/components/CodeEditor.jsx (what languages does CodeMirror support?)
  Dockerfile
  docker-compose.yml
  tests/integration/snippets-run.test.js
  tests/integration/playground.test.js

Write a review covering:

1. LANGUAGE EXTENSION FEASIBILITY
   - What does adding a new language require? (Dockerfile change? languages.js change? CodeMirror extension?)
   - Which languages are already in Alpine / node:24-alpine? (bash, python3, lua, java?)
   - Rate: Bash (effort + risk), Lua (effort + risk), Rust (effort + risk)

2. COMPILER FLAGS
   - Currently: server/languages.js compile() returns ['g++', ...files, '-o', bin]
   - What would adding per-snippet compileFlags look like? Where would they be injected?
   - What validation is needed to prevent flag injection attacks (e.g., -o /etc/passwd)?
   - Draft the validation logic (whitelist approach recommended).

3. EXECUTION HISTORY
   - meta.json currently has: id, title, tags, notes, language, files, createdAt, updatedAt
   - Sketch the data model for adding runHistory: [{ ranAt, stdin, stdout, stderr, exitCode }]
   - What's the size risk? (10 runs × 64KB stdin cap = 640KB per snippet — needs capping)
   - Which route handler would write it?

4. FULL-TEXT SEARCH
   - GET /api/snippets currently does N readFile calls for meta.json only.
   - Sketch a server-side grep approach: add ?q= param, read each file in each snippet dir.
   - What's the I/O cost at 50 snippets? At 200?
   - Is there a faster approach without SQLite?

5. SANDBOX ADEQUACY
   - Current sandboxing: ulimit -v 131072, 10s timeout, process group kill.
   - Is this sufficient for Bash execution (bash can do anything)?
   - What additional restrictions would you add for interpreted languages?

Write to: reviews/round2/r2-03-execution.md
```

---

#### Agent R2-4: Infrastructure and DevX Review

```
You are a read-only infrastructure reviewer. Do not change any files.

Read:
  docker-compose.yml
  Dockerfile
  entrypoint.sh
  package.json
  vite.config.js
  vitest.config.js
  eslint.config.js
  tests/ (all files)
  .claude/settings.json

Write a review covering:

1. DOCKER SETUP
   - Is the dev vs prod workflow clear? Any gaps?
   - Is there a healthcheck? Should there be?
   - The Dockerfile installs tailscale in the image — is this the right place or should it be a compose service?
   - entrypoint.sh handles tailscale startup — is this robust? What happens if tailscaled crashes?
   - The bind-mount is `. : /app` — this means node_modules from host could conflict. How is this handled?

2. TEST INFRASTRUCTURE
   - What's covered? What's not?
   - Tests run inside Docker — what's the ergonomics of this? Is there a faster feedback loop?
   - Are there any test gaps that would catch the most likely bugs? (e.g., no UI tests)
   - Is the test isolation clean? (tmp dirs per test, etc.)

3. BACKUP AND DATA SAFETY
   - Where is data stored? (`data/` bind-mounted)
   - What happens on `docker compose down`? Is data preserved?
   - Is there any automated backup mechanism?
   - What's the minimum viable backup strategy?

4. ENVIRONMENT CONFIGURATION
   - List all env vars used: AUTH_TOKEN, PORT, DATA_DIR, NODE_ENV — any others?
   - Are defaults sensible?
   - What documentation exists?

5. BUILD PIPELINE
   - Is there a CI config? What would a minimal GitHub Actions config look like?
   - Does `npm run build` produce an optimized prod bundle? Is code splitting happening?
   - What's the production startup sequence?

6. LOGGING
   - What does current logging look like in production?
   - What's missing (timestamps, request IDs, log levels)?

Write to: reviews/round2/r2-04-infra.md
```

---

#### Agent R2-5: Architecture Evolution Review

```
You are a read-only architecture reviewer. Do not change any files.

Read the full codebase:
  src/App.jsx — navigation state machine, view composition
  src/api.js — fetch wrapper
  src/views/* — all four views
  src/components/* — three components
  server/index.js — Express setup
  server/routes.js — API handlers
  server/executor.js — code execution
  server/languages.js + src/languages.js — dual registries
  data/ — a few meta.json files to understand the storage schema

Write a review covering:

1. NAVIGATION STATE MACHINE
   - App.jsx uses VIEWS enum and manual state transitions. Map every state and transition.
   - What are the edge cases? (e.g., what happens if you edit from list vs edit from detail?)
   - What would break first if a new top-level section is added (e.g., Settings)?
   - Is a custom router hook (history.pushState based) worth adding? What would it unlock?

2. PROP DRILLING ASSESSMENT
   - List every prop threaded through App.jsx → views.
   - Is any prop going more than 2 levels deep?
   - What state, if any, should be moved to context?

3. DATA LAYER
   - The filesystem storage schema: UUID dirs, meta.json, raw source files.
   - What are the consistency guarantees? (concurrent writes, partial failures)
   - What's the path to SQLite if needed? (migration complexity)
   - Is the dual language registry (server/languages.js + src/languages.js) a real maintenance risk?

4. COMPONENT ARCHITECTURE
   - Are there components that are too large? (doing too many things)
   - Are there patterns duplicated across views that should be extracted? (e.g., the run footer in DetailView and the run area in Playground are very similar)
   - Is the CodeMirror setup (BASE_EXTENSIONS, AUTO_HEIGHT_EXTENSIONS, SETUP constant) in CodeEditor.jsx clean?

5. TYPESCRIPT MIGRATION
   - Identify the 5 most error-prone untyped patterns in the current codebase.
   - Rate the migration effort realistically (how many files, how many types needed).
   - Is the benefit worth it for a personal single-developer tool?

6. BUNDLE ANALYSIS
   - Which dependencies are largest? (highlight.js, CodeMirror, React)
   - Is code splitting (React.lazy) in App.jsx enough?
   - Would removing highlight.js (if B2 is implemented) noticeably reduce bundle size?

Write to: reviews/round2/r2-05-architecture.md
```

---

### Phase 2: Consolidation Agent

Run after all five Phase 1 agents complete and commit their files to `reviews/round2/`.

```
You are a planning agent. Do not change any source files.

Read all five review files:
  reviews/round2/r2-01-features.md
  reviews/round2/r2-02-ux.md
  reviews/round2/r2-03-execution.md
  reviews/round2/r2-04-infra.md
  reviews/round2/r2-05-architecture.md

Also read the existing master plan for context on what was ALREADY fixed:
  reviews/00-master-plan.md

Your job:

1. DEDUPLICATE — multiple reviewers will have flagged the same things. Collapse duplicates, keeping the most detailed description.

2. PRIORITIZE — rank every distinct improvement as: MUST / SHOULD / NICE.
   Criteria for a personal single-developer tool:
   - MUST: daily workflow pain, data safety risk, or broken feature
   - SHOULD: meaningful improvement to common workflows, reasonable effort
   - NICE: good idea but not blocking anything

3. CREATE WORK BATCHES with zero file-ownership overlap between simultaneous batches.
   Goal: maximum parallelism for Phase 3.
   Each batch must specify:
   - Exact list of files it owns (no file in two batches)
   - Exact list of improvements it covers
   - Dependencies on other batches (if any)

4. Write the master plan to: reviews/round2/r2-00-master-plan.md

Format: same as reviews/00-master-plan.md. Include:
- Priority list (deduplicated, ordered)
- File change map (which files change in which batch)
- Work packages (Batch definitions with file ownership)
- Batch dependency order diagram

Then commit:
  git add reviews/round2/r2-00-master-plan.md
  git commit -m "plan(round2): consolidated master plan from r2 reviews

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

### Phase 3: Parallel Implementation Agents

Run after `r2-00-master-plan.md` is committed. One agent per batch. Batches defined by the master plan — the exact prompts below assume the batch split most likely to emerge from Phase 2 based on this analysis.

**Adjust batch names and file lists based on what r2-00-master-plan.md actually says.**

---

#### Batch R2-A: Backend Features (server/)

```
You are an implementation agent. You own these files exclusively:
  server/routes.js
  server/executor.js
  server/languages.js
  server/index.js

Read the master plan first: reviews/round2/r2-00-master-plan.md
Read the relevant reviews: reviews/round2/r2-03-execution.md, reviews/round2/r2-04-infra.md

Implement the following in this batch:

1. BASH LANGUAGE SUPPORT
   Add to server/languages.js:
   - bash entry: ext '.sh', srcFile 'main.sh', compile: null
   - runner: (_bin, srcFiles) => ['bash', srcFiles[0]]
   - playgroundWrap: (code) => code
   No compile step. Security note: bash execution is unrestricted — same sandbox as current (ulimit + timeout + process group kill).

2. COMPILER FLAGS PER SNIPPET (if in master plan)
   - Add compileFlags field support in POST and PUT handlers (validate: whitelist of safe flags only)
   - Safe whitelist: ['-O0', '-O1', '-O2', '-O3', '-Os', '-Wall', '-Wextra', '-Werror', '-std=c++17', '-std=c++20', '-std=c11', '-std=c17', '-lm', '-lpthread']
   - Reject: any flag containing '/', '$(', '`', '-o', '-MF', '-include', or shell metacharacters
   - Pass flags to compile() call in the run handler

3. JSON EXPORT ENDPOINT
   Add GET /api/export to routes.js:
   - Read all snippet dirs, build full payload including file contents
   - Return: { exportedAt: ISO string, version: 1, snippets: [...] }
   - Set header: Content-Disposition: attachment; filename="codevault-backup-YYYY-MM-DD.json"

4. FULL-TEXT SEARCH (server-side grep)
   - Add optional ?q= param to GET /api/snippets
   - If q is present and non-empty: for each snippet, check title/tags/notes (already done) PLUS read each source file and check content
   - Return only matching snippets
   - Keep existing no-q behavior unchanged

5. HEALTHCHECK ENDPOINT
   Add GET /api/health to routes.js: res.json({ ok: true, snippets: <count> })
   (docker-compose healthcheck can use this)

After implementing, run tests (if in Docker context) or note which tests to run.

Commit when batch is done:
  git add server/
  git commit -m "feat(batch-r2a): bash language, compiler flags, export endpoint, content search

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

#### Batch R2-B: Frontend — New Features in Views (src/views/ + src/api.js)

```
You are an implementation agent. You own these files exclusively:
  src/views/ListView.jsx
  src/views/DetailView.jsx
  src/views/EditorView.jsx
  src/views/Playground.jsx
  src/api.js

Read the master plan first: reviews/round2/r2-00-master-plan.md
Read: reviews/round2/r2-01-features.md, reviews/round2/r2-02-ux.md

Implement the following:

1. COPY CODE BUTTON in DetailView.jsx
   - Add a copy icon button (SVG clipboard icon) to the top-right of the code block area
   - Uses navigator.clipboard.writeText(file.content)
   - Shows brief "Copied!" text for 1.5s (local state)

2. PINNED SNIPPETS in ListView.jsx
   - Show a ★ icon on each snippet card
   - Clicking it toggles pinned state via api.updateSnippet(id, { pinned: true/false })
   - Pinned snippets appear at top of the list regardless of sort order
   - Add pinned visual distinction (subtle — slightly different border color or icon fill)

3. SNIPPET DUPLICATION in ListView.jsx / DetailView.jsx
   - Add "Duplicate" to the context menu in ListView (and as an action button in DetailView)
   - api.createSnippet({ ...snippet, title: 'Copy of ' + snippet.title, files: snippet.files })
   - After duplication, navigate to the new snippet's detail view

4. SORT OPTIONS in ListView.jsx
   - Add a sort dropdown (or cycling button) next to the snippet count
   - Options: Recent (updatedAt desc), Oldest (updatedAt asc), A→Z (title asc), Z→A (title desc)
   - Sort is purely client-side (data already loaded)
   - Persist choice in localStorage('cv-sort')

5. EXPORT BUTTON in ListView.jsx
   - Small "Export" button in list-header
   - Calls GET /api/export, triggers browser download via <a download> trick
   - Add api.exportSnippets() to api.js

6. TIMESTAMPS in DetailView.jsx
   - Show createdAt and updatedAt as small muted text below the title
   - Format: "Created May 16, 2026 · Updated May 20, 2026"
   - Use Intl.DateTimeFormat for locale-aware formatting

7. KEYBOARD SHORTCUTS (global handler in App.jsx scope... but wired in ListView for /)
   - Note: keyboard shortcut wiring spans App.jsx which you don't own.
   - For this batch: add a visible "Search" autofocus when user types "/" — handle in ListView.jsx useEffect that adds a keydown listener, only active when ListView is mounted.
   - Ctrl+S in EditorView.jsx: add a keydown listener in EditorView, call handleSave if Ctrl+S / Cmd+S.
   - Ctrl+Enter in DetailView.jsx + Playground.jsx: add keydown listener, call handleRun.

8. api.js additions:
   - api.exportSnippets() → fetch('/api/export')
   - api.pinSnippet(id, pinned) → api.updateSnippet(id, { pinned })

Commit when done:
  git add src/views/ src/api.js
  git commit -m "feat(batch-r2b): copy button, pinned snippets, duplication, sort, export, shortcuts

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

#### Batch R2-C: Frontend — UI/UX (src/components/ + src/App.css + src/App.jsx)

```
You are an implementation agent. You own these files exclusively:
  src/App.jsx
  src/App.css
  src/components/CodeBlock.jsx
  src/components/CodeEditor.jsx
  src/components/ConfirmDialog.jsx
  src/index.css

Read the master plan first: reviews/round2/r2-00-master-plan.md
Read: reviews/round2/r2-02-ux.md, reviews/round2/r2-05-architecture.md

Implement the following:

1. DESKTOP TWO-PANE LAYOUT — this is the highest priority in this batch.
   In App.jsx and App.css:
   - At min-width: 900px, apply a CSS grid layout: 280px left pane + flex-1 right pane
   - Left pane: always shows ListView
   - Right pane: shows DetailView, EditorView, or Playground depending on state
   - Bottom nav at mobile → left sidebar at desktop (CSS only, no markup changes)
   - ListView must remain visible on desktop when a detail view is open
   - On desktop, the "back" button in DetailView/EditorView becomes a no-op or is hidden
   - The app title moves to the left sidebar header at desktop
   Breakpoint: @media (min-width: 900px) {}

2. CODEMIRROR READ-ONLY VIEWER — replace CodeBlock.jsx
   Replace highlight.js with a read-only CodeMirror instance:
   - EditorState.readOnly.of(true)
   - Same extensions as CodeEditor but no closeBrackets, no autocompletion
   - lineNumbers: true
   - Add a copy-to-clipboard button in the component's top-right
   - Keep the same filename header UI
   - Export as `CodeBlock` — same interface as before (code, filename, language props)
   - Do NOT remove CodeEditor.jsx

3. LOADING SKELETONS
   Add CSS @keyframes shimmer animation to App.css:
   ```css
   @keyframes shimmer {
     0% { background-position: -400px 0; }
     100% { background-position: 400px 0; }
   }
   .skeleton {
     background: linear-gradient(90deg, var(--surface) 25%, var(--border) 50%, var(--surface) 75%);
     background-size: 800px 100%;
     animation: shimmer 1.4s infinite;
     border-radius: 4px;
   }
   ```
   Use in: ListView (skeleton cards while loading), DetailView (skeleton code block while loading).

4. TOAST NOTIFICATION SYSTEM
   Add a Toast component and hook to App.jsx:
   - A fixed positioned div at bottom-right (desktop) or bottom-center above nav (mobile)
   - Slides in/out via CSS transform transition
   - Props: message, type ('success'|'error'), duration (default 3000ms)
   - App.jsx manages a toast queue state: [{ id, message, type }]
   - Pass a showToast(message, type) callback down to views
   - Use success toasts on: snippet saved, snippet deleted, snippet duplicated, export downloaded
   - Use error toasts for: fetch errors (in addition to inline error display)

5. FONT SIZE CONTROL
   - Add --code-font-size CSS variable to :root (default: 13px)
   - Apply to .cm-editor, .run-stdout, .run-stderr, .code-block code
   - Add a font size toggle button (Aa) in App.jsx that cycles: 12 → 13 → 14 → 15 → 12
   - Persist in localStorage('cv-font-size')
   - On mount, read from localStorage and set the CSS variable

6. COLOR PALETTE FIXES
   - Change --muted from #555 to #888 for better placeholder contrast
   - Remove opacity: 0.9 from .card-tag (use full var(--accent))
   - FAB shadow: reduce to rgba(184, 245, 66, 0.15)
   - Unify all tag displays to same color/opacity

7. EMPTY STATE
   - In ListView: when vault is empty, show an empty state with a message and a "Add your first snippet" button styled with accent color
   - When search returns nothing: show "No matches for [term]" with a "Clear" link

Commit when done:
  git add src/App.jsx src/App.css src/components/ src/index.css
  git commit -m "feat(batch-r2c): desktop layout, codemirror viewer, skeletons, toasts, font size

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

#### Batch R2-D: Infrastructure & Config

```
You are an implementation agent. You own these files exclusively:
  docker-compose.yml
  Dockerfile
  entrypoint.sh
  package.json
  scripts/backup.sh (new file — create it)
  docs/env.md (new file — create it)
  .github/workflows/test.yml (new file — create it)
  src/languages.js (ONLY the bash addition)

Read the master plan first: reviews/round2/r2-00-master-plan.md
Read: reviews/round2/r2-04-infra.md

Implement the following:

1. DOCKER HEALTHCHECK
   Add to docker-compose.yml service:
   ```yaml
   healthcheck:
     test: ["CMD", "wget", "-qO-", "http://localhost:5174/api/health"]
     interval: 30s
     timeout: 5s
     retries: 3
     start_period: 15s
   ```

2. BACKUP SCRIPT
   Create scripts/backup.sh:
   ```bash
   #!/bin/sh
   set -e
   DEST="${BACKUP_DIR:-$HOME/backups}/codevault-$(date +%Y%m%d-%H%M).tar.gz"
   mkdir -p "$(dirname "$DEST")"
   tar -czf "$DEST" ~/docker/myapp/data/
   echo "Backup written to: $DEST"
   ```
   chmod +x it.

3. ENV DOCUMENTATION
   Create docs/env.md documenting:
   - AUTH_TOKEN (optional, enables bearer auth on all /api routes)
   - PORT (default: 5174)
   - DATA_DIR (default: /app/data or ../data relative to server/)
   - NODE_ENV (production | development)
   - BACKUP_DIR (used by backup script, default: ~/backups)

4. GITHUB ACTIONS CI
   Create .github/workflows/test.yml:
   ```yaml
   name: Test
   on: [push, pull_request]
   jobs:
     test:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v4
         - uses: actions/setup-node@v4
           with:
             node-version: 24
             cache: npm
         - run: npm ci
         - run: npm test
   ```

5. BASH LANGUAGE in src/languages.js (coordinated with Batch A server/languages.js)
   Add:
   ```js
   bash: {
     label: 'Bash',
     defaultFile: 'main.sh',
     hljsLang: 'bash',
     playgroundDefault: '#!/bin/bash\n\necho "Hello, World!"\n',
   }
   ```

Commit when done:
  git add docker-compose.yml Dockerfile entrypoint.sh package.json scripts/ docs/env.md .github/ src/languages.js
  git commit -m "feat(batch-r2d): healthcheck, backup script, CI, env docs, bash language

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

#### Batch R2-E: Tests (run after A, B, C, D)

```
You are an implementation agent. You own these files exclusively:
  tests/
  (all files under tests/ — add new files as needed)

Read the master plan first: reviews/round2/r2-00-master-plan.md
Read: reviews/round2/r2-03-execution.md, reviews/round2/r2-04-infra.md

Do NOT modify any source files (server/, src/). Only add/modify test files.

Implement the following:

1. BASH LANGUAGE TESTS (new file: tests/integration/snippets-run-bash.test.js or extend existing)
   - Create a bash snippet, run it, verify stdout
   - Verify stdin piping works (read from stdin in bash script)
   - Verify timeout applies to bash (infinite loop test)

2. EXPORT ENDPOINT TESTS (extend tests/integration/snippets-crud.test.js)
   - GET /api/export returns 200 with Content-Disposition header
   - Response body has version:1, exportedAt, snippets array
   - Snippet objects include file contents
   - Empty vault returns empty snippets array

3. FULL-TEXT SEARCH TESTS (extend snippets-crud.test.js)
   - GET /api/snippets?q=someword finds snippets with that word in file content
   - GET /api/snippets?q=someword does NOT return snippets where word only appears in deleted text
   - GET /api/snippets (no q) still works as before

4. HEALTHCHECK ENDPOINT TESTS
   - GET /api/health returns { ok: true }
   - GET /api/health returns 200 status

5. COMPILER FLAGS TESTS (extend snippets-run.test.js, if Batch A implemented compiler flags)
   - Valid flag (-O2) is accepted and passed to compiler
   - Invalid flag (-o /etc/passwd) is rejected with 400
   - Flag injection attempt ('; rm -rf /') is rejected with 400

6. PINNED SNIPPETS TESTS (extend snippets-crud.test.js)
   - Create snippet with pinned:true, verify it appears first in GET /api/snippets
   - Update snippet to pinned:false, verify it returns to date-sorted position
   (Note: pinning sort may be client-side — test whatever the actual implementation does)

Run tests inside Docker to verify:
  docker compose --profile test run --rm test

Commit when done:
  git add tests/
  git commit -m "test(batch-r2e): bash, export, full-text search, health, compiler flags tests

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

### Phase 4: Integration Check Agent

Run after all Phase 3 batches complete.

```
You are an integration verification agent. Do not add new features.

Read:
  reviews/round2/r2-00-master-plan.md (what was supposed to be implemented)
  All source files (verify implementations are present)
  All test files (verify new tests exist)

Perform these checks:

1. LANGUAGE REGISTRY SYNC
   Compare Object.keys(LANGUAGES) in server/languages.js vs src/languages.js.
   They must be identical. If not, identify the discrepancy and fix the smaller file.

2. API CONTRACT CHECK
   For each new endpoint added (export, health, ?q= search, compileFlags):
   - Verify the route exists in server/routes.js
   - Verify api.js has a matching wrapper (where applicable)
   - Verify at least one test covers it

3. DESKTOP LAYOUT SMOKE CHECK
   Read src/App.jsx and src/App.css.
   Verify the @media (min-width: 900px) breakpoint exists and applies a two-column layout.
   Verify ListView is always rendered at desktop width (not conditional on view state).

4. FEATURE COMPLETENESS
   For each MUST-HAVE item in the master plan, verify it was implemented.
   For each SHOULD-HAVE item, note which ones were done and which were deferred.

5. NO REGRESSIONS
   Check that existing API routes are unchanged:
   GET /api/snippets, GET /api/snippets/:id, POST /api/snippets,
   PUT /api/snippets/:id, DELETE /api/snippets/:id,
   POST /api/snippets/:id/run, POST /api/playground/run

6. TEST COVERAGE GAPS
   List any MUST-HAVE features that have no test coverage.

Write findings to: reviews/round2/r2-integration-check.md

If any critical issues found (broken route, missing implementation, registry mismatch):
  Fix them directly.
  Commit the fix:
    git add <files>
    git commit -m "fix(r2-integration): <description of what was broken>

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Batch Dependency Order

```
Phase 1 (parallel — all read-only, no file overlap):
  ├── R2-1  feature gap review   → reviews/round2/r2-01-features.md
  ├── R2-2  UX review            → reviews/round2/r2-02-ux.md
  ├── R2-3  execution review     → reviews/round2/r2-03-execution.md
  ├── R2-4  infra review         → reviews/round2/r2-04-infra.md
  └── R2-5  architecture review  → reviews/round2/r2-05-architecture.md

Phase 2 (after Phase 1):
  └── Consolidation → reviews/round2/r2-00-master-plan.md

Phase 3 (parallel — non-overlapping file ownership):
  ├── Batch R2-A  server/              (backend features)
  ├── Batch R2-B  src/views/ src/api.js (frontend features)
  ├── Batch R2-C  src/App.jsx src/App.css src/components/ src/index.css (UI/UX)
  └── Batch R2-D  docker-compose.yml Dockerfile entrypoint.sh package.json scripts/ docs/ .github/ src/languages.js

Phase 4 (after Phase 3):
  └── Batch R2-E  tests/ (integration + unit tests for everything new)

Phase 5 (after Phase 4):
  └── Integration check agent
```

**Critical path:**
- Batch R2-A (export endpoint, search, bash language) must complete before R2-E tests can run.
- Batch R2-C (desktop layout, CodeMirror viewer) is independent and can run in parallel with R2-A.
- Batch R2-D is tiny and low-risk — run it first or in parallel with everything.
- R2-B (frontend features) depends on R2-A for the export endpoint to exist — or can stub it and finish wiring after.

**Minimum viable batch if you want fast results:**
R2-A (export + health) + R2-C (desktop layout) + R2-D (backup script + CI). That's one weekend of work for the highest-impact changes with zero risk to existing functionality.
