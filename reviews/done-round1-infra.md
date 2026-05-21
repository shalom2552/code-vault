# Infra Round 1 — Done

## Docker Healthcheck
- `docker-compose.yml`: added `healthcheck` block targeting `GET /api/health` via wget
- interval 30s, timeout 5s, 3 retries, 10s start_period

## GitHub Actions CI
- `.github/workflows/ci.yml`: push + PR to main → Node 24 → npm ci → npm test
- No Docker build in CI (kept simple per spec)

## ESLint
- `eslint.config.js` already existed with `js.configs.recommended` + react-hooks + react-refresh
- No changes needed — config already satisfies spec

## Pre-commit Hook
- Added `husky` + `lint-staged` to `devDependencies`
- Added `"prepare": "husky"` script to `package.json`
- `.husky/pre-commit`: runs `npx lint-staged`
- `.lintstagedrc`: ESLint `--max-warnings 0` on `*.{js,jsx}`

## PWA Offline
- `vite.config.js`: added `workbox.runtimeCaching` to VitePWA config
  - `NetworkFirst` for `/api/snippets` and `/api/snippets/:id` (with `?` query support), 10s network timeout, 24h TTL, 50 entries
  - `CacheFirst` for static assets (js/css/png/svg/ico/woff), 7d TTL, 100 entries
- `injectRegister: 'auto'` set explicitly — injects SW registration into index.html at build time
- No changes to `src/App.jsx` or `src/main.jsx`

## Files Changed
- `docker-compose.yml` — modified
- `.github/workflows/ci.yml` — new
- `package.json` — devDependencies + scripts only
- `.lintstagedrc` — new
- `.husky/pre-commit` — new
- `vite.config.js` — workbox config added
