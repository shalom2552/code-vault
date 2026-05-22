# Setup Guide

Follow this guide to get CodeVault running on your system in under 5 minutes.

## Prerequisites

- **Docker** and **Docker Compose**
- **Tailscale** (Optional, for remote access and HTTPS)

## Quick Start

1. **Clone and Run:**
   ```bash
   git clone <repo-url>
   cd codevault
   docker compose up --build -d
   ```

2. **Set up Authentication:**
   By default, anyone can access your snippets. To secure it, set an auth token:
   ```bash
   # Edit docker-compose.yml or set in your environment
   # environment:
   #   - AUTH_TOKEN=your-secret-token
   ```

3. **Access the App:**
   Open [http://localhost:5174](http://localhost:5174) in your browser.

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `AUTH_TOKEN` | **Highly Recommended.** Bearer token for API access. | _(disabled)_ |
| `PORT` | The port the app runs on. | `5174` |
| `DATA_DIR` | Where snippets are stored. | `./data` |

## First Use

1. Click the **+** button to create your first snippet.
2. Choose a language (C++, C, or Python).
3. Write some code and click **Save**.
4. Click **Run** to execute the code and see the output.
5. (Optional) Install the app as a **PWA** via your browser's "Install App" feature for offline viewing.

## Remote Access (Tailscale)

If you want to access CodeVault from anywhere:
1. Log in to Tailscale inside the container:
   ```bash
   docker exec -it codevault tailscale login
   ```
2. Your app will be available at `https://codevault.<your-tailnet>.ts.net`.

## Data Management

- **Storage:** All snippets are stored as plain files in the `data/` directory.
- **Backup:** Run the backup script to create a timestamped archive:
  ```bash
  ./scripts/backup.sh
  ```
- **Restore:** Simply extract an export or a backup back into the `data/` directory.

## Updating

To get the latest version:
```bash
git pull
docker compose up --build -d
```

## Troubleshooting

- **Tailscale Login:** If the login link doesn't appear, check the container logs: `docker logs codevault`.
- **Port Conflict:** If `5174` is taken, change the mapping in `docker-compose.yml` (e.g., `"8080:5174"`).
- **Permissions:** If the app can't save snippets, ensure the `data/` directory is writable by the user running Docker.
