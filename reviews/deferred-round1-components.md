# Deferred Changes - UI Components

The following changes are required in the view files and `App.jsx` to fully utilize the new component system:

1. **`App.jsx`**: Wrap the entire application (or at least the part that needs toasts) in `ToastProvider` from `src/components/ToastContext.jsx`.
2. **`ListView.jsx`**:
   - Replace the manual "loading" text with `LoadingSkeleton` (variant="card").
   - Replace the manual "empty" text with `EmptyState`.
3. **`DetailView.jsx`**:
   - Replace the loading state with `LoadingSkeleton` (variant="detail").
   - Support `fontSize` control (e.g., via a toggle in the header).
4. **`EditorView.jsx`**:
   - Replace the loading state with `LoadingSkeleton` (variant="editor").
   - Use `toast()` from `useToast()` for save success/error notifications instead of `alert()` or console logs.
   - Support `fontSize` control.
5. **`Playground.jsx`**:
   - Use `toast()` for copy or execution errors.
   - Support `fontSize` control.

### Component API Reminders
- `CodeBlock`: `fontSize` (number, default 14), `language` (supports 'bash' and 'text' now).
- `CodeEditor`: `fontSize` (number, default 14), `language` (supports 'bash' and 'text' now).
- `Toast`: `toast(message, type)` where type is 'success', 'error', or 'info'.
- `LoadingSkeleton`: `variant` is one of 'card', 'detail', 'editor'.
- `EmptyState`: `icon`, `title`, `subtitle`, `actionLabel`, `onAction`.
