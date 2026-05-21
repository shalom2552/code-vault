# Done: Directory Naming Redesign (Frontend)

I have implemented the frontend changes required to support the directory naming redesign (switching from UUIDs to human-readable slugs).

## Changes Made

### 1. Robust API Calls (`src/api.js`)
- Added `encodeURIComponent(id)` to all snippet-related API calls (`getSnippet`, `updateSnippet`, `deleteSnippet`, `runSnippet`).
- This ensures that any valid directory name (including slugs with underscores or manually created directories with special characters) is safely transmitted in the URL.

### 2. UUID Assumption Removal (`src/views/EditorView.jsx`)
- Replaced `crypto.randomUUID()` with a simple `makeKey()` generator for internal React keys used in the multi-file editor.
- While these were not snippet identifiers, this change ensures the frontend code is completely free of UUID-specific assumptions or generation logic, adhering to the spirit of the redesign.

### 3. Verification of Identifier Agnosticism
- Verified that `ListView.jsx`, `DetailView.jsx`, and `App.jsx` already treated snippet IDs as opaque strings.
- Confirmed that no regex validation or format assumptions for snippet IDs existed in the frontend codebase.

## Deferred Backend Needs
Documented in `reviews/deferred-dir-naming-backend.md`:
- Update `validId` regex in `server/routes.js` to allow underscores (`_`).
- Implement `makeSlug(title)` and update the `POST` route in `server/routes.js`.
- Update integration tests to use slug-compliant fake IDs for 404/400 checks.
- Create and run the directory migration script.
