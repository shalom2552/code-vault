# CodeVault — Combined Improvement Plan

**Date:** 2026-05-21  
**Source:** Consolidated from plan_claude.md + plan_gemini.md  
**Codebase snapshot:** C++/C/Python, highlight.js viewer, CodeMirror editor, filesystem storage, PWA, optional bearer auth

---

## Deduplication Notes

| Topic | Decision |
|---|---|
| TypeScript | **Rejected.** 9 source files. Claude says no; Gemini says must-have. Wrong call for personal tool. JSDoc if needed. |
| React Router | **Rejected.** Custom router hook (D1) covers the real need (browser back, deep links) without dependency lock-in. |
| Zustand | **Rejected.** Prop drilling is 2 levels max. `useContext` + `useReducer` if it grows. Not now. |
| CSS Modules | **Rejected.** Single `App.css` is organized and works. No benefit for 5 components. |
| Triple-column layout | **Rejected.** Gemini proposes Folders sidebar as column 1. No folders planned. Two-pane is the right call. |
| Framer Motion | **Rejected.** Gemini prescribes it for transitions. Pure CSS keyframes do the job without 30KB dep. |
| Folders/Collections | **Rejected.** Personal tool, ~10 snippets. Tags are enough. Revisit at 100+. |
| Smart Folders | **Rejected.** Dynamic collections based on tag combos — overkill for solo use. |
| Shared Buffers | **Rejected.** Piping snippet output to another snippet is a feature for a team product, not a personal vault. |
| Variable Templates | **Rejected.** `{{API_KEY}}` substitution — complex, no clear daily need. |
| Command Palette | **Rejected.** Useful concept, but the app has 4 views and a few actions. Keyboard shortcuts (B3) cover 90% of the value. |
| Git-backed storage | **Rejected.** Claude explicitly lists this as "not to build." Data is bind-mounted; git is right there if versioning matters. |
| Fuse.js fuzzy search | **Rejected.** Server-side grep (A3) is simpler, no client dep, sufficient for <200 snippets. |

---

## A. FEATURES

### A1. Copy-Code Button in Detail View
**What:** Clipboard icon button in the code block header. `navigator.clipboard.writeText(file.content)`. Brief "Copied!" feedback for 1.5s.  
**Why:** Daily paper cut on mobile — long-press select-all is 5 taps. One button = one tap.  
**Effort:** S | **Priority:** must-have | **Source:** claude

---

### A2. Full-Text Search in Code Content
**What:** Extend `GET /api/snippets?q=<term>` to read each snippet's source files and match content, not just title/tags/notes. Currently `ListView.jsx:99–107` only searches metadata.  
**Why:** You remember writing a function but not what snippet it's in. Full-text search is the killer feature of a vault.  
**Implementation:** Server-side per-file read + string match. Fine for <200 snippets. SQLite FTS5 later if slow.  
**Effort:** M | **Priority:** must-have | **Source:** both

---

### A3. JSON Export / Backup
**What:** `GET /api/export` returns `{ exportedAt, version: 1, snippets: [{ meta, files: [{name, content}] }] }`. Response header: `Content-Disposition: attachment; filename="codevault-backup-YYYY-MM-DD.json"`. Export button in list header.  
**Why:** Data lives on a Docker container. One wrong `docker compose down -v` and it's gone. One-click export is the minimum safety net.  
**Effort:** S | **Priority:** must-have | **Source:** claude

---

### A4. Desktop Two-Pane Layout
**What:** At `min-width: 900px`: CSS grid with 280px left pane (always-visible list + search + tags) and `flex: 1` right pane (detail/editor/playground). Bottom nav becomes left sidebar at desktop width.  
**Why:** App is currently phone-width (680px max) centered on a 1440px monitor. Huge dead margins. List and detail should be permanently co-visible — every successful snippet manager does this.  
**Effort:** L | **Priority:** must-have | **Source:** both

---

### A5. CodeMirror Read-Only Viewer (replaces highlight.js)
**What:** Replace `CodeBlock.jsx` (highlight.js) with a read-only CodeMirror 6 instance: `EditorState.readOnly.of(true)`, line numbers on, same oneDark theme as editor, copy button top-right, word-wrap toggle.  
**Why:** Removes highlight.js entirely (bundle reduction). Gives line numbers, copy, consistent theming with the editor, and room for future find-in-file. A11 (line numbers alone) is subsumed by this.  
**Effort:** M | **Priority:** must-have | **Source:** claude

---

### A6. Bash Language Support
**What:** Add `bash` entry to `server/languages.js` and `src/languages.js`. No compile step. Runner: `['bash', srcFiles[0]]`. Already installed in Alpine — no Dockerfile change.  
**Why:** Shell scripts are a non-trivial fraction of useful snippets. Currently can't store them runnable.  
**Effort:** S | **Priority:** should-have | **Source:** claude

---

### A7. Compiler Flags Per Snippet
**What:** `compileFlags` array in `meta.json`. Editable in EditorView. Passed to `compile()` in the run handler. Validated against a whitelist: `-O0/1/2/3/Os`, `-Wall`, `-Wextra`, `-Werror`, `-std=c++17/20`, `-std=c11/17`, `-lm`, `-lpthread`. Reject anything with `/`, `$(`, backtick, `-o`, or shell metacharacters.  
**Why:** Embedded/systems code needs `-O2`. Math code needs `-lm`. Currently everything compiles with bare `g++ file.cpp -o bin`.  
**Effort:** M | **Priority:** should-have | **Source:** claude

---

### A8. Pinned/Starred Snippets
**What:** Boolean `pinned` field in `meta.json`. Star icon on list cards. Pinned snippets always sort to top regardless of `updatedAt`.  
**Why:** Reference snippets (sin LUT, singleton pattern) keep getting buried as new snippets are added.  
**Effort:** S | **Priority:** should-have | **Source:** both

---

### A9. Snippet Duplication
**What:** "Duplicate" action in detail view (and optionally list context menu). Creates new snippet: `title: "Copy of X"`, same files, same language, same tags. Navigates to new snippet detail.  
**Why:** Starting a variation from an existing snippet currently takes 4 navigation steps.  
**Effort:** S | **Priority:** should-have | **Source:** claude

---

### A10. Execution History
**What:** `runHistory: [{ ranAt, stdin, stdout, stderr, exitCode }]` in `meta.json`, capped at 5 entries. Collapsible "History" section in DetailView below current output.  
**Why:** You run, scroll away, come back — output is gone. Tweak code, re-run — did it improve? No reference without copy-pasting.  
**Effort:** M | **Priority:** should-have | **Source:** claude

---

### A11. Font Size Control
**What:** `--code-font-size` CSS custom property (default 13px). `Aa` button in detail view and playground cycles 12 → 13 → 14 → 15 → 12. Applied to `.cm-editor`, `.run-stdout`, `.run-stderr`. Persisted in `localStorage`.  
**Why:** 13px monospace on a phone at arm's length is borderline unreadable. Mobile-specific pain.  
**Effort:** S | **Priority:** should-have | **Source:** claude

---

### A12. Language Filter Chips
**What:** Quick-filter chips above the snippet list (or next to the search bar) for each language in use. Clicking filters to that language only. Multi-select OK.  
**Why:** "Show me all my C++ snippets" is a common query. Tags alone don't capture this.  
**Effort:** S | **Priority:** should-have | **Source:** gemini

---

### A13. Sort Options
**What:** Sort control in list header (cycling button or dropdown): Recent (updatedAt desc, default), Oldest, A→Z, Z→A. Client-side only — data already loaded. Persisted in `localStorage`.  
**Why:** Alphabetical sort is faster for scanning as the vault grows.  
**Effort:** S | **Priority:** nice-to-have | **Source:** claude

---

### A14. Timestamps in Detail View
**What:** Show `createdAt` and `updatedAt` as small muted text below the title. Already in `meta.json`, never surfaced. Format with `Intl.DateTimeFormat`.  
**Why:** "Did I write this before or after the refactor?" Currently no way to know.  
**Effort:** tiny | **Priority:** nice-to-have | **Source:** claude

---

### A15. Paste from Clipboard
**What:** "Paste from clipboard" button in EditorView (new snippet). Calls `navigator.clipboard.readText()`, populates the first file's content.  
**Why:** Creates snippet from copied code without precision-tapping inside the CodeMirror editor on mobile.  
**Effort:** S | **Priority:** nice-to-have | **Source:** claude

---

## B. UI/UX

### B1. Loading Skeletons
**What:** Replace every "Loading..." with animated skeleton placeholders: 3-4 skeleton cards in list view, skeleton header + code block in detail view. Pure CSS `@keyframes shimmer` with moving gradient. No library.  
**Why:** Makes the app feel faster on mobile Tailscale connections.  
**Effort:** S | **Priority:** should-have | **Source:** both

---

### B2. Toast Notifications
**What:** `Toast` component sliding in from bottom (above nav on mobile, bottom-right on desktop). Success: "Snippet saved", "Snippet deleted", "Copied". Error: "Save failed". Auto-dismiss 3s, manual ✕. Single `showToast(message, type)` callback from `App.jsx`.  
**Why:** Currently no feedback on success actions. Error banners are inline and easy to miss.  
**Effort:** S | **Priority:** should-have | **Source:** both

---

### B3. Keyboard Shortcuts
**What:**
- `/` — focus search (ListView, when mounted)
- `Ctrl+S` / `Cmd+S` — save (EditorView)
- `Ctrl+Enter` / `Cmd+Enter` — run (DetailView + Playground)
- `Escape` — back/cancel (detail, editor)
- `n` — new snippet (ListView)

Keydown listeners scoped to the active view; don't capture inside CodeMirror.  
**Why:** Constant switching between this app and an editor makes mouse navigation slow on desktop.  
**Effort:** S | **Priority:** should-have | **Source:** both

---

### B4. PWA Offline Cache
**What:** Workbox `NetworkFirst` strategy for `GET /api/snippets` and `GET /api/snippets/:id`. Fallback to cache when offline. Read-only (can't run or edit offline). Configure in `vite.config.js` workbox options.  
**Why:** Tailscale can drop. On mobile looking up a reference, a blank screen is useless.  
**Effort:** M | **Priority:** should-have | **Source:** claude

---

### B5. Swipe Navigation on Mobile
**What:** Swipe right → back (from detail, editor). Touch events on main content area, explicitly excluded from CodeMirror pane.  
**Why:** PWA standalone mode has no browser back. Swipe-back is the mobile native pattern.  
**Effort:** M | **Priority:** nice-to-have | **Source:** claude

---

### B6. Color Palette Fixes
**What:** Specific CSS fixes:
- `--muted: #555` → `#888` (WCAG AA contrast on `#161616`)
- Remove `opacity: 0.9` from `.card-tag` — use full `var(--accent)`
- FAB shadow: `rgba(184, 245, 66, 0.3)` → `rgba(184, 245, 66, 0.15)`
- Unify all tag displays to same color/opacity

**Why:** Inconsistencies in the current palette. `.muted` fails contrast check. Not a redesign — keep lime-on-black.  
**Effort:** tiny | **Priority:** nice-to-have | **Source:** claude

---

### B7. Empty State Improvements
**What:** Empty vault: ASCII vault or SVG icon + "Your vault is empty" + accent-colored "Add your first snippet" button. No-results: "No matches for '[term]'" + "Clear search" link.  
**Why:** Bare centered text is a missed opportunity to prompt action.  
**Effort:** tiny | **Priority:** nice-to-have | **Source:** claude

---

## C. INFRASTRUCTURE / DX

### C1. Backup Script
**What:** `scripts/backup.sh` — tars `~/docker/myapp/data/` to `~/backups/codevault-YYYYMMDD-HHMM.tar.gz`. Document weekly cron in README.  
**Why:** Bind-mounted `data/` has zero automated backup. One accident = everything gone.  
**Effort:** tiny | **Priority:** must-have | **Source:** both

---

### C2. Docker Healthcheck
**What:** Add to `docker-compose.yml`:
```yaml
healthcheck:
  test: ["CMD", "wget", "-qO-", "http://localhost:5174/api/health"]
  interval: 30s
  timeout: 5s
  retries: 3
  start_period: 15s
```
Add `GET /api/health` route returning `{ ok: true, snippets: <count> }`.  
**Why:** Without it, Docker marks a crashed Node process as "running."  
**Effort:** tiny | **Priority:** should-have | **Source:** both

---

### C3. GitHub Actions CI
**What:** `.github/workflows/test.yml` — checkout, setup-node@24, `npm ci`, `npm test`. Ubuntu runners have gcc/g++/python3 — matches Alpine close enough for integration tests.  
**Why:** No safety net on push. Test-breaking refactors only surface when you remember to run docker compose.  
**Effort:** S | **Priority:** should-have | **Source:** both

---

### C4. Env Var Documentation
**What:** `docs/env.md` — table of `AUTH_TOKEN`, `PORT`, `DATA_DIR`, `NODE_ENV`, defaults, behavior if unset.  
**Why:** Currently scattered across `server/index.js` with no single reference.  
**Effort:** tiny | **Priority:** should-have | **Source:** claude

---

### C5. Structured Logging
**What:** `server/log.js` — `{ info, error }` with ISO timestamp prefix. Replace `console.error` calls. No external dep (no Winston, no Pino).  
**Why:** Production diagnosis is harder without timestamps or log levels.  
**Effort:** S | **Priority:** nice-to-have | **Source:** claude

---

### C6. Pre-commit Hooks
**What:** Configure ESLint (already present) to run on staged files via `lint-staged` + `husky` (or manually via git hook).  
**Why:** Catches lint errors before they land in git history.  
**Effort:** S | **Priority:** nice-to-have | **Source:** gemini

---

## D. ARCHITECTURE

### D1. Custom Router Hook (browser back + deep links)
**What:** A `useRouter` hook wrapping the VIEWS state machine that calls `history.pushState` on navigation and listens for `popstate`. Enables `/#/<id>` deep links to specific snippets and PWA back-button support.  
**Why:** In PWA standalone mode, the OS back button does nothing. Deep linking lets you bookmark specific snippets.  
**Effort:** M | **Priority:** nice-to-have | **Source:** claude  
**Not:** Full React Router. No new dependency.

---

### D2. SQLite Storage (deferred)
**What:** Migrate filesystem storage to SQLite + FTS5. Schema: `snippets(id, meta_json)`, `files(snippet_id, name, content)`, `files_fts(content)`.  
**Why:** Only justified if full-text search (A2 via server-side grep) becomes slow at 50+ snippets.  
**Trigger:** Implement A2 first. If grep performance is acceptable, skip this indefinitely.  
**Effort:** L | **Priority:** nice-to-have | **Source:** both

---

## Priority Summary

| ID | Feature | Effort | Priority | Source |
|---|---|---|---|---|
| A1 | Copy-code button | S | must | claude |
| A2 | Full-text content search | M | must | both |
| A3 | JSON export endpoint + button | S | must | claude |
| A4 | Desktop two-pane layout | L | must | both |
| A5 | CodeMirror read-only viewer | M | must | claude |
| C1 | Backup script | tiny | must | both |
| A6 | Bash language | S | should | claude |
| A7 | Compiler flags per snippet | M | should | claude |
| A8 | Pinned snippets | S | should | both |
| A9 | Snippet duplication | S | should | claude |
| A10 | Execution history | M | should | claude |
| A11 | Font size control | S | should | claude |
| A12 | Language filter chips | S | should | gemini |
| B1 | Loading skeletons | S | should | both |
| B2 | Toast notifications | S | should | both |
| B3 | Keyboard shortcuts | S | should | both |
| B4 | PWA offline cache | M | should | claude |
| C2 | Docker healthcheck + /api/health | tiny | should | both |
| C3 | GitHub Actions CI | S | should | both |
| C4 | Env var documentation | tiny | should | claude |
| A13 | Sort options | S | nice | claude |
| A14 | Timestamps in detail | tiny | nice | claude |
| A15 | Paste from clipboard | S | nice | claude |
| B5 | Swipe navigation | M | nice | claude |
| B6 | Color palette fixes | tiny | nice | claude |
| B7 | Empty state improvements | tiny | nice | claude |
| C5 | Structured logging | S | nice | claude |
| C6 | Pre-commit hooks | S | nice | gemini |
| D1 | Custom router hook | M | nice | claude |
| D2 | SQLite storage | L | nice | both |

**Must-have batch:** A1, A2, A3, A4, A5, C1  
**Should-have batch:** A6–A12, B1–B4, C2–C4  
**Nice-to-have:** Everything else
