# Bug Fixes Round 2

## BUG 1 — Fixed (prior round)

## BUG 2 — Fixed (prior round)

## BUG 3 — Duplicate in ListView card menu
**File:** `src/views/ListView.jsx`
Added `handleDuplicate(s)` — fetches full snippet via `api.getSnippet`, then calls `api.createSnippet` with `title = "{title} (copy)"`. Added "Duplicate" button to the ctx-menu above Pin.

## BUG 4 — Editor horizontal scroll broken
**File:** `src/components/CodeEditor.jsx`
Changed `autoHeightTheme` scroller from `overflow: 'visible'` to `overflowX: 'auto', overflowY: 'visible'`. Now the editor captures horizontal touch/scroll internally instead of propagating to the page, while still growing vertically without a vertical scrollbar.

## BUG 5 — Pin icon in dropdown menus
**Files:** `src/views/ListView.jsx`, `src/views/DetailView.jsx`
Removed `📌` emoji from "Pin" text in both ctx-menus. Icon remains only on the card title as a pinned indicator.

## BUG 6 — Rate limiter blocks after ~10 runs
**File:** `server/routes.js`
Changed `max: 10` → `max: 60` on `runLimiter`. 60 runs/min is appropriate for a personal single-user Tailscale app.

## BUG 7 — Clicking snippet from playground doesn't navigate (two-pane)
**File:** `src/App.jsx`
Added `setTab(TABS.SNIPPETS)` to `goDetail`. Previously, clicking a snippet while on Playground set `view = DETAIL` but left `tab = PLAYGROUND`, so DetailView never rendered. Now the tab switches too.

## BUG 8 — Code blocks push page wider
**File:** `src/components/CodeBlock.jsx`
Changed `readOnlyTheme` scroller from `overflow: 'visible'` to `overflow: 'auto'`. Long lines now scroll horizontally within the code block instead of expanding the page.

## BUG 9 — Success toast on code run
**File:** `src/views/Playground.jsx`
Removed `toast('Run completed successfully', 'success')`. Output appearing in the output area is sufficient feedback. Error toasts remain.

## BUG 10 — Toast renders behind nav bar
**File:** `src/App.css`
Changed base `bottom: 24px` to `calc(60px + env(safe-area-inset-bottom) + 8px)` so toast clears the mobile nav bar. Added `bottom: 24px` override in the `@media (min-width: 900px)` block where the nav is hidden.

## Test results
140/140 tests pass (no regressions).
