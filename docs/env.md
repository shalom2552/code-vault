# Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | HTTP port the server listens on | `5174` |
| `DATA_DIR` | Absolute path to the snippet storage directory | `<repo>/data` |
| `AUTH_TOKEN` | Bearer token for API authentication. Unset = auth disabled. All `/api` routes except `/api/health` require `Authorization: Bearer <token>` when set. | *(unset)* |
| `NODE_ENV` | Set to `production` to serve compiled frontend from `dist/` instead of running Vite dev server | *(unset)* |
| `BACKUP_DIR` | Directory where `scripts/backup.sh` writes timestamped tarballs | `<repo>/backups` |
| `VITEST` | Set automatically by the Vitest test runner. Disables rate limiting on run endpoints during tests. | *(unset)* |
