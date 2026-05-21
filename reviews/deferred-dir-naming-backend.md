# Deferred Backend Changes for Directory Naming Redesign

The frontend has been updated to be identifier-agnostic and robust to human-readable slugs. The following backend changes (as identified in `docs/plans/directory-naming-redesign.md`) are required to complete the transition:

## 1. Update ID Validation Regex
In `server/routes.js`, the `validId` function must be updated to allow underscores, which are used in the new slug format.
- **File:** `server/routes.js`
- **Current:** `const validId = (id) => /^[a-zA-Z0-9-]+$/.test(id)`
- **Required:** `const validId = (id) => /^[a-z0-9_-]+$/.test(id)`

## 2. Implement Slug Generation
A new `makeSlug(title)` function should be added and used in the `POST` route instead of `randomUUID()`.
- **File:** `server/routes.js`
- **Function:**
```js
function makeSlug(title) {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40)
    || 'snippet'
  const hash = randomUUID().replace(/-/g, '').slice(0, 8)
  return `${slug}_${hash}`
}
```

## 3. Update Integration Tests
Integration tests that use UUID-formatted strings as fake nonexistent IDs will now return `400 Bad Request` instead of `404 Not Found` due to the regex change. These should be updated to use slug-compliant strings.
- **File:** `tests/integration/snippets-crud.test.js`
- **File:** `tests/integration/snippets-run.test.js`
- **Example:** Change `'00000000-0000-0000-0000-000000000000'` to `'nonexistent_00000000'`.

## 4. Run Migration
The migration script `scripts/migrate-dirs.js` (once created) needs to be executed against the `data/` directory while the server is stopped.
