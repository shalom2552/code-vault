# Done: Round 2 Layout

Commit: `feat(app): two-pane layout, keyboard shortcuts, toast wiring, font size`

## Files changed

| File | Type |
|------|------|
| `src/App.jsx` | rewrite |
| `src/App.css` | additions |
| `src/hooks/useKeyboardShortcuts.js` | new |

## Implemented

### 1. Two-pane layout

- `.list-pane` (left, 350px fixed) + `.main-pane` (right, flex 1) via CSS media query at ≥900px.
- Mobile (<900px): single-view — `list-pane-mobile-hidden` / `main-pane-mobile-hidden` classes hide the inactive pane. Identical to prior single-view navigation flow.
- Desktop: both panes always visible; hidden classes overridden with `display: flex !important`.
- FAB repositioned to `position: absolute` within `.list-pane` on desktop so it stays in the left column.
- `.desktop-bar` (tab nav + font toggle) shows above ListView on desktop only; hidden on mobile via `display: none`.
- `.bottom-nav` hidden on desktop via `display: none !important`.
- `.detail-empty` (EmptyState "Select a snippet") shown in right pane on desktop when no snippet is selected.

### 2. Toast provider

Already wired in prior pass. Verified `<ToastProvider>` wraps the app root.

### 3. VIEWS / TABS constants

Unchanged — already complete. Both enums used throughout App.jsx.

### 4. Keyboard shortcuts (`src/hooks/useKeyboardShortcuts.js`)

| Key | Condition | Action |
|-----|-----------|--------|
| `/` | not in input/editor | focus `.search-input` |
| `Ctrl+S` | `isInEditor` | click `.save-btn:not([disabled])` |
| `Ctrl+Enter` | `isInDetail` or `isInPlayground` | click `.playground-run-btn:not([disabled])` |
| `Esc` | not in input/editor | call `onBack` (navigates back per current view) |

`onBack` kept fresh via ref to avoid stale closures. Hook deps are primitive booleans only.

### 5. Font size toggle

- "Aa" button cycles 12 → 14 → 16px. Preference stored in `localStorage` key `code-font-size`.
- Desktop: button in `desktop-bar` (top of left pane).
- Mobile: third button in bottom nav (label + current size).
- Applied via `.font-size-N` class on `.app`, CSS `!important` overrides `.cm-editor { font-size }`.

## Deferred

See `reviews/deferred-round2-layout.md` for:
- Proper `fontSize` prop forwarding through view files
- `searchRef` forwarding through ListView
- FAB offset cleanup
- ListView title on desktop
- Imperative handle pattern for keyboard triggers
