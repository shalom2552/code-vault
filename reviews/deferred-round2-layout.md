# Deferred: Round 2 Layout

Items that require touching view or component files, deferred from the app-level layout pass.

## 1. Font size prop forwarding

**Current state:** `App.jsx` stores `fontSize` (12/14/16) and applies `.font-size-N` class to `.app`. This triggers `!important` CSS overrides on `.cm-editor`. Works as a fallback.

**Proper fix:** Pass `fontSize` down through views to CodeBlock and CodeEditor via props.

Changes needed:
- `DetailView.jsx`: accept `fontSize` prop, pass to `<CodeBlock fontSize={fontSize} />`
- `EditorView.jsx`: accept `fontSize` prop, pass to `<CodeEditor fontSize={fontSize} />`
- `Playground.jsx`: accept `fontSize` prop, pass to `<CodeEditor fontSize={fontSize} />`
- `App.jsx` (already owned): pass `fontSize` to those view components

## 2. Search focus ref (keyboard shortcut `/`)

**Current state:** `useKeyboardShortcuts` does `document.querySelector('.search-input')?.focus()`. Works but is DOM-coupled.

**Proper fix:** `ListView.jsx` should accept a `searchRef` prop and forward it to the `<input>`. App.jsx creates the ref and passes it; hook uses the ref directly.

## 3. FAB bottom offset on desktop

**Current state:** CSS repositions `.list-pane .fab` to `position: absolute; right: 16px; bottom: 16px`. Works but overrides the safe-area calc.

**Proper fix:** `ListView.jsx` should accept an `isDesktop` bool or a CSS class override for FAB offset, so the fixed positioning logic lives in one place.

## 4. "CodeVault" list header visible on desktop

The list pane shows the full ListView including its "CodeVault" title. On desktop with the `desktop-bar` above it, this is slightly redundant. `ListView.jsx` could accept a `hideTitle` prop to suppress `app-title` on desktop.

## 5. Keyboard Ctrl+S / Ctrl+Enter via DOM click

**Current state:** Hook clicks `.save-btn` and `.playground-run-btn` via `querySelector`. Works but fragile if button selectors change.

**Proper fix:** Views expose imperative handles via `useImperativeHandle` / `forwardRef`, or App.jsx passes `onCtrlS` / `onCtrlEnter` callback props to views.
