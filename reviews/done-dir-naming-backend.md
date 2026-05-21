# Backend: Directory Naming Redesign — Done

## Changes

### server/routes.js
- `validId` regex: `^[a-zA-Z0-9-]+$` → `^[a-z0-9_-]+$` (allows underscores for slugs)
- Added `makeSlug(title)`: lowercase, replace non-alnum runs with `_`, strip leading/trailing `_`, truncate slug to 40 chars, append `_` + 8 hex chars from `randomUUID()`. Fallback to `snippet` for empty result.
- POST /api/snippets: `const id = randomUUID()` → `const id = makeSlug(title.trim())`
- All other path construction unchanged — `dir(id)` helper, PUT/DELETE/run handlers all still work; the `id` in meta.json equals the directory name (slug going forward)

### scripts/migrate-dirs.js (new)
- Reads all UUID-format dirs in `data/` (skips already-migrated slug dirs)
- Generates slug via same `makeSlug` logic, retries up to 20× on collision
- `fs.rename` (atomic on same filesystem) then updates `meta.json` id field
- Writes `data/.migration-map.json` for rollback
- `--dry-run` flag: logs all renames, touches nothing
- `--data-dir <path>` flag: override data location

### scripts/rollback-migration.js (new)
- Reads `data/.migration-map.json`
- Renames slug dirs back to UUIDs, restores id in meta.json
- `--dry-run` flag
- Removes `.migration-map.json` on clean rollback

## Dry-run result (against live data)

```
8 entries total, 8 UUID dirs to migrate
  03673715-abac-4833-8cfc-7d78079f16a9  →  get_current_time_02e59fe8
  296752b1-7e70-4adf-9e0c-4cb39451db9d  →  212_word_search_ii_3bc32a97
  71146e59-cbca-4d35-8b81-454903c0504f  →  function_run_time_474c28a1
  804e9896-4df3-4b9d-a4bc-f3e91348599e  →  unordered_map_3aeb4488
  a595ca9e-40ad-4f8a-bdce-940854886dbc  →  bit_packer_173061f0
  b475de49-09b9-4af0-9570-2e0a7da9f5db  →  little_or_big_endian_dc2047fb
  ca667bdb-3f05-4dc8-a306-dad3bffb0f40  →  sin_lut_and_taylor_eb8d3a13
  daad605b-7d99-4432-9bb2-4027ebc2e0f9  →  singleton_7b13d226
Done: 8 renamed, 0 skipped, 0 errors
```

## Test impact

No test changes needed. The deferred-dir-naming-backend.md note about
`00000000-0000-0000-0000-000000000000` failing the new regex was incorrect:
that string contains only `0-9` and `-`, which all pass `^[a-z0-9_-]+$`.
Tests continue to get 404 as expected (no such directory exists).

Old UUID dir names also still pass the new regex — the backend works with
existing UUID dirs before migration runs.

## Manual data/ contract

Preserved: `GET /api/snippets` is a stateless `readdir` + `meta.json` parse.
Any dir added manually with a valid `meta.json` is picked up on next request.

## To run migration (stop server first)

```bash
# dry run
node scripts/migrate-dirs.js --dry-run

# live
node scripts/migrate-dirs.js

# rollback if needed
node scripts/rollback-migration.js
```
