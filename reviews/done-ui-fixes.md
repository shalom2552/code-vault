# UI Fix Pass — Summary

**Date:** 2026-05-21  
**Files changed:** App.jsx, App.css, ListView.jsx, DetailView.jsx, CodeBlock.jsx, Playground.jsx

---

## What changed

### 1. Font size control moved (issues 1, 10)
- Removed `Aa 12px` button from desktop nav bar.
- Removed font toggle from mobile bottom nav (now 2 items: Snippets, Playground).
- Added `Aa` button to CodeBlock toolbar header — visible in DetailView, contextually near code.
- Added `Aa` button to Playground header right area.
- `cycleFont` passed App → DetailView → CodeBlock; App → Playground.

### 2. Collapsible filter bar (issues 2, 9)
- Search input always visible at top.
- `Filters (N)` toggle button below search, collapsed by default.
- Expanded panel shows three rows: Sort dropdown, Language chips, Tag chips.
- `filter-label` (60px wide) labels each group: Sort / Language / Tags.
- Language chips: `lang-chip` class — accent-fill background, accent border, no `#` prefix. Active state: solid accent fill with black text.
- Tag chips: existing `tag-chip` class — outline/ghost style, `#` prefix. Visually distinct at a glance.
- Active filter count shown in button label, button turns accent when any filter active.
- Sort moved from list header into the filter panel.

### 3. Running animation (issue 3)
- Replaced `…` text in run buttons (DetailView + Playground) with `<span class="spinner" /> Running…`.
- CSS: 12px circle, `border-top-color: var(--accent)`, 0.6s spin, `vertical-align: middle`.

### 4 & 11. Pin redesign (issues 4, 11)
- Removed always-visible star button from snippet cards.
- Cards show `📌` indicator only when pinned (subtle, inline with title).
- Unpinned cards: no icon at all.
- Pin/Unpin action lives in card ⋮ context menu (3 items: Edit, Pin/Unpin, Delete).
- Pin/Unpin also in DetailView ⋮ overflow menu.
- Menu height calc updated from 96px to 144px for 3 items.

### 5. Duplicate copy button removed (issue 5)
- Removed `Copy` button from DetailView header.
- `handleCopyCode` function removed from DetailView.
- Copy in CodeBlock component toolbar is sufficient.

### 6 & 8. Detail header overhaul (issues 6, 8)
- Header now two-row layout via `.nav-header.detail-nav` (flex-direction: column).
- Row 1 (`detail-header-top`): back arrow + title (with 📌 if pinned) + Edit button + ⋮ overflow button.
- Row 2 (`.detail-timestamps`): relative timestamps, padded left to align under title.
- Removed: Copy, Duplicate, star/pin, Delete from header buttons.
- ⋮ overflow menu (fixed-positioned, click-outside to close): Duplicate, Pin/Unpin, Delete (red).

### 7. Timestamps (issue 7)
- `relativeTime(dateStr)` helper: just now / Nm ago / Nh ago / Nd ago / Nmo ago / Ny ago.
- `TimestampRow` component: if created ≈ updated (within 1s), shows only "Created Xd ago". Otherwise both "Created … · Updated …".
- Full datetime on hover via `title` attribute on each `<span>`.

### 12. Mobile sanity (issue 12)
- `detail-header-top` items: back (44px min-width) + title (flex:1, truncates) + actions (shrink:0). Fits 380px.
- `.overflow-btn` has `min-width: 44px` — tappable touch target.
- Filter panel is vertical flex, wraps chips — no horizontal scroll.
- All existing wrapping/ellipsis behavior preserved.

---

## CSS additions (App.css)
- `@keyframes spin` + `.spinner`
- `.filter-toggle-btn`, `.filter-toggle-arrow`, `.filter-panel`, `.filter-group`, `.filter-label`, `.filter-chips`, `.filter-sort-select`
- `.lang-chip` (+ `.active`)
- `.pin-indicator`
- `.nav-header.detail-nav`, `.detail-header-top`, `.detail-timestamps`
- `.overflow-btn`
- `.font-aa-btn`
- `.code-block-actions`
