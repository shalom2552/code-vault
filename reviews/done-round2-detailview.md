# Round 2: DetailView and EditorView Updates

## DetailView Improvements
- Added a "Copy" button in the view-level header to copy the currently active file's code to the clipboard, providing toast feedback.
- Updated the "Pin/Unpin" toggle to use star icons and provide toast feedback.
- Implemented a "Duplicate" button in the header that clones the current snippet data (with " (copy)" appended to the title) and uses toast feedback.
- Added created and updated timestamps as subtle secondary text below the snippet title in the header.
- Limited the execution history list to only show the last 5 run results.
- Ensured `LoadingSkeleton` with `variant="detail"` is used while the snippet is initially fetching.
- Added consistent usage of `useToast` for copy, duplicate, pin, and delete actions.

## EditorView Improvements
- Validated existing implementation of `COMPILER_FLAGS` multi-select options for `c` and `cpp` files.
- Added a "Paste from clipboard" button next to each file's code editor, writing directly from `navigator.clipboard.readText()` to the file content, with toast feedback.
- Ensured `LoadingSkeleton` with `variant="editor"` is used while an existing snippet is loading for editing.
- Kept the use of `useToast` for save successes and errors intact.
