# Cleanup Report

This report identifies files and directories that should be removed or ignored before making the repository public.

## Summary Table

| Item | Recommendation | Reason |
|------|----------------|--------|
| `reviews/` | **DELETE** | Internal development review notes and history. |
| `docs/plans/` | **DELETE** | Internal planning documents and technical designs. |
| `docs/snipeets_accses.md` | **DELETE** | Original user request with typos; now redundant. |
| `scripts/migrate-dirs.js` | **DELETE** | One-time migration script for legacy UUID format. |
| `scripts/rollback-migration.js` | **DELETE** | Rollback script for the legacy migration. |
| `CLAUDE.md` | **DELETE** | Internal tool-specific configuration guide. |
| `.claude/` | **DELETE** | Internal tool history and logs (if any committed). |
| `data/` | **KEEP** | Essential for app function, but must remain empty of personal data. |
| `docs/env.md` | **KEEP** | Useful reference for environment variables. |
| `scripts/backup.sh` | **KEEP** | Useful utility for users. |
| `scripts/rollback-migration.js` | **DELETE** | Redundant. |

## Detailed Findings

### Internal Artifacts
- **`reviews/`**: This directory contains 30+ files detailing the step-by-step development and review process. While interesting for contributors, it adds significant clutter for users.
- **`docs/plans/`**: contains draft designs and "plan" files used during development.

### Scripts
- **Migration Scripts**: `scripts/migrate-dirs.js` and `scripts/rollback-migration.js` were used to move snippet storage from UUIDs to human-readable slugs. Fresh installations will use slugs by default, making these obsolete.

### Documentation Duplication
- **`docs/env.md`**: Much of this is now covered in the new `docs/SETUP-GUIDE.md`, but it serves as a good technical reference. Recommended to keep but perhaps consolidate later.
- **`README.md`**: contains a mix of user and dev info. The new `docs/SETUP-GUIDE.md` is more user-focused.

### Code Quality
- **Console Logs**: `server/log.js` implements a custom logger using `console.log`, which is acceptable. No stray "debug" logs were found in the main application logic.
- **TODOs**: Only one TODO was found in an internal planning doc, which is scheduled for deletion.

### Gitignore Check
- `.gitignore` is well-configured for `node_modules`, `dist`, and `data/`.
- **Note**: Ensure `data/` remains empty in the repository. It currently is.

## Cleanup Commands

Run these commands to clean up the repository before making it public:

```bash
# Remove internal development notes and plans
rm -rf reviews/
rm -rf docs/plans/
rm docs/snipeets_accses.md

# Remove one-time migration scripts
rm scripts/migrate-dirs.js
rm scripts/rollback-migration.js

# Remove internal tool guides
rm CLAUDE.md
rm -rf .claude/

# Ensure data directory is empty but exists
find data/ -mindepth 1 -delete
touch data/.gitkeep

# Update .gitignore if needed
echo "data/*" >> .gitignore
echo "!data/.gitkeep" >> .gitignore
```
