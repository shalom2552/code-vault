#!/bin/sh

# 1. Start the Tailscale daemon in the background
tailscaled --socket=/var/run/tailscale/tailscaled.sock &

# 2. Wait for the daemon to be ready to accept commands
until [ -S /var/run/tailscale/tailscaled.sock ]; do sleep 0.5; done

# 3. Handle Login
if tailscale status | grep -q "Logged out"; then
    echo "-------------------------------------------------------"
    echo "ACTION REQUIRED: Tailscale Login"
    echo "Run this command in a new terminal:"
    echo "docker exec -it codevault tailscale login"
    echo "-------------------------------------------------------"
    # Wait until the user completes the login
    until ! tailscale status | grep -q "Logged out"; do sleep 2; done
fi

# 4. Configure Identity
# We set the hostname BEFORE starting the app to ensure the URL is correct
echo "Setting Tailscale hostname to 'codevault'..."
tailscale up --hostname=codevault --reset --accept-dns=true

# 5. Handle node_modules (if in dev mode with a bind-mount)
if [ "$NODE_ENV" != "production" ] && [ ! -d "node_modules" ]; then
    echo "node_modules not found. Installing..."
    npm install
fi

# 6. Start the CodeVault server in the background
echo "Starting CodeVault server..."
if [ "$NODE_ENV" = "production" ]; then
    node server/index.js &
else
    npm run dev &
fi

# 7. Wait for the Node server to be active
# This prevents the proxy from starting before there is something to proxy to
echo "Waiting for server to listen on port 5174..."
until nc -z 127.0.0.1 5174; do sleep 1; done

# 8. Start the Tailscale proxy
echo "Starting Tailscale serve..."
tailscale serve --https=443 off >/dev/null 2>&1
tailscale serve --bg http://localhost:5174

echo "-------------------------------------------------------"
echo "CodeVault is ready at: https://codevault.<tailnet>.ts.net"
echo "-------------------------------------------------------"

# 9. Keep container alive and wait for background processes
wait
