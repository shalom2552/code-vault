# Done: Directory Naming Integration

## Summary

Migration from UUID to human-readable slug directories completed successfully.

## What Was Done

### Deferred items applied
- Backend `validId` regex (`^[a-z0-9_-]+$`) and `makeSlug()` — already committed in `685ae78`
- Migration + rollback scripts — already committed in `685ae78`
- Frontend `encodeURIComponent` + UUID assumption removal — already committed in `9175a10`
- Integration tests: no change needed — `00000000-0000-0000-0000-000000000000` passes new regex (only `0-9` and `-`), still returns 404

### Migration execution
1. Dry-run verified: 8 UUID dirs → 8 slug names, 0 errors
2. Live run from host: `fs.rename` succeeded (dirs renamed), `writeFile meta.json` failed — `EACCES` because `data/` files are root-owned (Docker)
3. Fix: ran `fix-meta-ids.mjs` inside Docker container to patch the 8 `meta.json` `id` fields
4. Verified via `GET /api/snippets` — all 8 snippets returned with slug IDs

### API contract verified

| Operation | Result |
|-----------|--------|
| `GET /api/snippets` | 8 snippets, all slug IDs |
| `GET /api/snippets/:slug` | Full detail + file contents |
| `POST /api/snippets` | Creates `test_snippet_d003191d`-style slug |
| `POST /api/snippets/:slug/run` | exit 0, stdout correct |
| `PUT /api/snippets/:slug` | title updated |
| `DELETE /api/snippets/:slug` | dir removed |

### Tests

138/138 pass (`npm test` inside Docker, 5 test files).

## data/ state

All 8 dirs now human-readable:
```
212_word_search_ii_38a2e21f
bit_packer_8573490f
function_run_time_006c3361
get_current_time_a03a06ed
little_or_big_endian_8aed7783
sin_lut_and_taylor_583fc4c8
singleton_0a5064b2
unordered_map_37267ca5
```

Rollback available via `node scripts/rollback-migration.js` using `data/.migration-map.json`.

## Notes

- `randomUUID()` in playground route (line 231) intentionally kept — used for `/tmp/playground-<uuid>` temp dirs, not data dirs
- `data/` is gitignored; migration state lives in `data/.migration-map.json` on host only
