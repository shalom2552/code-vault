# CodeVault Evolution Plan

CodeVault is a functional, secure, and reliable snippet manager. This plan outlines the transition from a "working tool" to a "professional developer productivity suite."

## 1. Missing Features (The "Pro" Workflow)

### A. Search & Discovery
*   **Fuzzy Global Search:** Use a library like `Fuse.js` to provide fuzzy matching across titles, notes, and tags.
*   **Content Search:** Indexed search inside code snippets (initially simple grep-like search, eventually SQLite FTS).
*   **Language Filtering:** Quick filter chips for languages in the search bar.
*   **Recent/Pinned:** A "Jump Back In" section for recently edited or pinned snippets.

### B. Organization
*   **Folders/Collections:** Hierarchy to group related snippets (e.g., "React Patterns", "C++ Algorithms").
*   **Multi-Select:** Batch tag or delete snippets.
*   **Smart Folders:** Dynamic collections based on tags (e.g., "All Python snippets tagged 'web'").

### C. Editor & Execution
*   **Advanced Editor Features:** Enable Vim/Emacs keybindings via settings, multi-cursor support, and "Format Code" button (using Prettier/Clang-format via backend).
*   **Shared Buffers:** Ability to run a snippet with the output of another (advanced piping).
*   **Variable Templates:** Define placeholders like `{{API_KEY}}` that the UI prompts for before running.

### D. Productivity
*   **Command Palette:** `Cmd+K` (or `Ctrl+K`) to trigger any action (Search, New Snippet, Change Theme, Run).
*   **Keyboard Shortcuts:** `Cmd+S` (Save), `Cmd+Enter` (Run), `Cmd+N` (New), `Cmd+[` / `Cmd+]` (Navigation).
*   **Quick Add:** A small "In-tray" for snippets pasted from the clipboard that need organization later.

---

## 2. UI/UX Overhaul (Mobile + Desktop)

### A. Layout Evolution
*   **Desktop (Double/Triple Column):**
    - Left: Navigation Sidebar (Folders, Tags, Favorites).
    - Middle: Snippet List (Search + Cards).
    - Right: Detail/Editor View.
*   **Mobile (Bottom Nav + Sheets):**
    - Bottom Nav for "Snippets", "Playground", "Search".
    - Slide-up sheets for filters and tag selection.
*   **Responsive Transition:** Sidebar collapses into a hamburger menu or "Library" tab on mobile.

### B. Visual Direction: "The Minimalist IDE"
*   **Palette:** Deep slate/charcoal backgrounds, high-contrast text, and single-color accents (e.g., Electric Blue or Cyber Green) for actions.
*   **Typography:** Use Inter or Geist for UI, JetBrains Mono for code.
*   **Consistency:** Replace custom CSS buttons with a cohesive set of styled components.

### C. Micro-interactions
*   **View Transitions:** Smooth horizontal slides between List and Detail views using `Framer Motion`.
*   **Loading States:** Skeleton screens instead of "Loading..." text.
*   **Toasts:** Non-blocking notifications for "Saved", "Deleted", or "Execution Failed".

---

## 3. Developer Experience & Infrastructure

### A. Build & CI
*   **Pre-commit Hooks:** Linting and type-checking before every commit.
*   **GitHub Actions:** Basic CI to run Vitest and ESLint on every PR.
*   **Health Checks:** Docker healthcheck for the Express server.

### B. Data Integrity
*   **Backup Script:** Simple script to tar/gz the `/data` directory to a backup volume.
*   **Versioning:** Optional Git-backed storage for snippets (one git repo per vault) to allow history and diffing.

---

## 4. Technical Debt & Architecture

| Improvement | Why it matters | Effort | Priority | Dependencies |
| :--- | :--- | :--- | :--- | :--- |
| **React Router** | Removes manual state-based routing; enables deep-linking and browser "Back" button. | Medium | **Must-have** | None |
| **TypeScript** | Eliminates entire classes of runtime errors; provides better IntelliSense. | Large | **Must-have** | None |
| **SQLite Storage** | Allows complex queries (FTS, date ranges) and prevents filesystem race conditions. | Medium | **Should-have** | None |
| **Zustand** | Replaces prop-drilling for settings and global UI state. | Small | **Should-have** | None |
| **CSS Modules** | Scopes styles to components, preventing the current `App.css` bloat. | Medium | **Nice-to-have** | None |

---

## 5. Multi-Agent Implementation Strategy

### Phase 1: Research & Schema Design (Read-Only)
Four parallel agents analyze specific domains and write reports to `reviews/v2-*.md`.

*   **Agent 1 (Routing & State):** Plan the migration to `react-router` and `zustand`. Map out all routes and global state needs.
*   **Agent 2 (Data Migration):** Design the SQLite schema to replace `meta.json` and plan the "fs-to-sqlite" migration script.
*   **Agent 3 (Visual Design & Layout):** Design the new responsive 3-column layout and the CSS variable system.
*   **Agent 4 (Type System):** Map out the TypeScript interfaces for Snippets, Files, and API responses.

### Phase 2: Consolidation & Tooling
One agent merges the reports into `reviews/v2-master-plan.md` and sets up the environment (installs `react-router`, `zustand`, `better-sqlite3`, `typescript`).

### Phase 3: Incremental Implementation (The "Batches")
Parallel agents work on non-overlapping batches.

*   **Batch A (Infrastucture):** Setup TypeScript, React Router, and SQLite backend.
*   **Batch B (Core UI):** Implement the new Sidebar and responsive Layout.
*   **Batch C (Features):** Add Fuzzy Search, Command Palette, and Keyboard Shortcuts.
*   **Batch D (Editor):** Upgrade CodeMirror with Vim mode and better extensions.

### Phase 4: Integration & Validation
One agent verifies all integrations, runs tests, and ensures the PWA manifest/offline support is working.

---

## Agent Prompts (Phase 1)

### Agent 1: Routing & State Specialist
```text
Role: Senior Frontend Architect
Task: Design the migration from manual state-based routing to React Router and Zustand.
1. Read App.jsx and understand the current 'tab' and 'view' logic.
2. Define a set of routes (e.g., /snippets, /snippets/:id, /snippets/new, /playground).
3. Identify global state that belongs in Zustand (e.g., active filters, search query, theme, user settings).
4. Write a report to 'reviews/v2-routing-state.md' with the proposed React Router structure and Zustand store definitions.
No code changes.
```

### Agent 2: Database Specialist
```text
Role: Database Engineer
Task: Design the SQLite schema to replace filesystem-based meta.json storage.
1. Read server/routes.js and server/index.js to understand how snippets are stored.
2. Design a 'snippets' table and a 'files' table (1:N relationship).
3. Design a 'tags' table or a JSON column for tags.
4. Plan a migration script that reads existing /data/*/meta.json and populates the DB.
5. Write a report to 'reviews/v2-database.md' with the SQL schema and migration plan.
No code changes.
```

### Agent 3: UI/UX Specialist
```text
Role: Senior UI/UX Designer
Task: Design the new responsive 3-column layout and visual system.
1. Read src/App.css and all views.
2. Propose a CSS variable-based theme (Dark/Light).
3. Design a layout that uses a Sidebar on desktop (folders/tags) and a bottom nav on mobile.
4. Detail the transitions using Framer Motion (or simple CSS) between views.
5. Write a report to 'reviews/v2-design-system.md' with the design specs.
No code changes.
```

### Agent 4: TypeScript Specialist
```text
Role: Senior TypeScript Developer
Task: Design the type system for the entire application.
1. Read all files in src/ and server/.
2. Define 'Snippet', 'SnippetFile', 'Language', and 'ApiResponse' interfaces.
3. Identify the most critical files for conversion (starting with api.js and routes.js).
4. Write a report to 'reviews/v2-typescript.md' with the full interface definitions and a conversion sequence.
No code changes.
```
