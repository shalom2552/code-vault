# Round 2: ListView and Playground Update

## Implemented Features

### ListView
1. **Language Filter Chips:** Added clickable chips for all unique languages found in the snippet list. Clicking a chip filters the list to that language, and the active chip is visually distinct.
2. **Sort Options:** Added a sort dropdown with options for Recent, Oldest, A-Z, and Z-A. The user's preference is stored in `localStorage` under `list-sort`.
3. **Pin Toggle:** Added a star/pin button to each snippet card. Clicking it calls `PATCH /api/snippets/:id/pin` and pinned items sort to the top of the list.
4. **JSON Export Button:** Kept the existing download button and ensured it successfully triggers a file download by calling `GET /api/export` and generating a JSON blob. Now uses the toast to report success or errors.
5. **Empty State:** Implemented the `EmptyState` component for when the vault is empty or no search/filter matches are found, including a CTA button to create a new snippet.
6. **Loading Skeleton:** Retained the `LoadingSkeleton` component usage (`variant="card"`) while fetching the snippet list.
7. **Toasts:** Integrated `useToast()` to display success and error messages for deleting, exporting, and pinning snippets.

### Playground
1. **Loading Skeleton:** Replaced the loading state text with `<LoadingSkeleton variant="detail" />` while code execution is in progress.
2. **Toasts:** Added success and error toasts for run results using `useToast()`.

These changes improve usability, provide better user feedback, and create a more polished experience for finding and testing snippets.