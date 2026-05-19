# Code Quality Review - CodeVault

## Summary (grade: Good)
The codebase is well-structured for a prototype, with a clear separation between client and server. The use of modern React patterns (hooks, functional components) and a registry-based approach for language support is commendable. However, there are significant opportunities for refactoring to improve DRYness, reduce complexity in the backend routes, and standardize UI patterns.

## Quick Wins
- **Dead Code:** Remove unused `.code-textarea` class from `src/App.css`.
- **Naming:** Rename `json` helper in `src/api.js` to something more descriptive like `parseResponse` or `handleJsonResponse`.
- **Magic Values:** Extract hardcoded timeouts in `server/routes.js` (10s/15s) and PORT (5173) in `server/index.js` into constants or environment variables.
- **Consistency:** Replace `confirm()` in `src/views/Playground.jsx` with the `ConfirmDialog` component to match the rest of the app.
- **Dead Code:** Remove unused `deleting` state in `src/views/ListView.jsx` or use it to show a loading state during deletion.

## Refactoring Targets
| File | Current State | Proposed Change | Effort Estimate |
|------|---------------|-----------------|-----------------|
| `server/routes.js` | `runSnippet` and `runPlayground` have ~80% identical execution logic. | Extract a shared `executeCode` utility function to handle `spawn`, timeouts, and stream collection. | Medium (1-2 hours) |
| `src/languages.js` & `server/languages.js` | Language configurations are duplicated with different properties. | Unify into a single shared config (if possible) or at least synchronize the `getLanguage` signature and property naming. | Low (< 1 hour) |
| `server/routes.js` | Route handlers perform validation, file IO, and business logic. | Move file system operations and execution logic into a `SnippetService`. | Medium (2-3 hours) |
| `src/views/ListView.jsx` | Contains logic for search, tag filtering, long-press, and context menus (~140 lines). | Extract `useLongPress` hook and separate the Context Menu into its own component. | Medium (1-2 hours) |
| `src/App.jsx` | Uses custom state-based navigation with multiple `goX` functions. | Introduce `react-router-dom` for cleaner navigation and URL-addressable snippets. | Medium (2 hours) |

## Style Inconsistencies
- **Navigation:** Mix of specialized `goX` functions and inline `setView` calls in `App.jsx`. Standardize on a routing library or a unified transition function.
- **Error Handling:** Backend routes use silent `try/catch` that return empty arrays or 404s. Standardize on a middleware-based error handler with proper logging.
- **Language Helpers:** `getLanguage` behaves differently on client vs server. Standardize the return type or rename to reflect the specific context (e.g., `getClientLanguageConfig`).
- **Keys:** `EditorView.jsx` uses a custom `uid()` with `Math.random()`, while other parts use `randomUUID` (server). Standardize on `crypto.randomUUID()` where available.
