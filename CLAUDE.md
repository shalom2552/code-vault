# Project Context

Personal app. Runs in Docker. Files mounted from `~/docker/myapp` on host — edit files directly, Docker picks up changes via Vite HMR.

Accessed from Android via Tailscale (private network, no public exposure).

## Stack

- React 19 + Vite (frontend)
- Backend: not yet — will be added to this same container (e.g. Express/Hono serving the Vite build)
- No routing lib yet, no state lib yet — add when actually needed

## Goals

- PWA installable on Android Chrome (manifest + service worker)
- Minimal, clean codebase — no boilerplate, no premature abstractions
- Build features on the fly as needed
- Backend will live in same container — one repo, one process (or Vite proxies to same Node process)

## PWA Status

- `index.html`: manifest linked, theme-color set, mobile-web-app-capable
- `public/manifest.webmanifest`: needs writing (permission issue blocked)
- `public/sw.js`: needs writing (permission issue blocked)
- Service worker registration: goes in `src/main.jsx`

To unblock: `sudo chown -R marshall:marshall /home/marshall/docker/myapp/src /home/marshall/docker/myapp/public`
Then run existing root-owned files can be overwritten.

## File Permission Issue

Docker created files as root. Root dir + `src/` + `public/` dirs are now marshall-owned. But existing *files* inside `src/` are still root-owned — can't overwrite without sudo. New files in those dirs can be created fine.

## Conventions

- No comments unless WHY is non-obvious
- No premature abstraction — three similar lines beat a helper
- Explain changes when making them — don't just silently rewrite files
- CSS: plain CSS, no framework yet (add Tailwind only if user asks)
- No TypeScript yet — plain JSX

## Running

```bash
cd ~/docker/myapp && npm run dev
```

Vite default port: 5173. Tailscale serve proxies it with HTTPS:

- **App URL:** `https://cachyos-nvme.tail5500ce.ts.net`
- Run: `tailscale serve --bg http://localhost:5173`
- Disable: `tailscale serve --https=443 off`
