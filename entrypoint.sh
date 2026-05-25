#!/bin/sh

# Install node_modules if missing (dev mode with bind-mount)
if [ "$NODE_ENV" != "production" ] && [ ! -d "node_modules" ]; then
    echo "node_modules not found. Installing..."
    npm install
fi

# Start the server first — container lifetime is tied to this process
echo "Starting CodeVault server..."
if [ "$NODE_ENV" = "production" ]; then
    node server/index.js &
else
    npm run dev &
fi
SERVER_PID=$!

# Wait for server to be ready
echo "Waiting for server on port 5174..."
until nc -z 127.0.0.1 5174; do sleep 1; done
echo "-------------------------------------------------------"
echo "CodeVault ready: http://localhost:5174"
echo "-------------------------------------------------------"

# Tailscale — fully backgrounded, never blocks the app
# Set TAILSCALE=0 or TAILSCALE=false to disable entirely
case "${TAILSCALE:-1}" in
    0|false) ;;
    *)
        (
            tailscaled --tun=userspace-networking --socket=/var/run/tailscale/tailscaled.sock &
            until [ -S /var/run/tailscale/tailscaled.sock ]; do sleep 0.5; done

            if tailscale status | grep -q "Logged out"; then
                echo "-------------------------------------------------------"
                echo "Tailscale: not logged in."
                echo "localhost:5174 is already available."
                echo "To also enable HTTPS on your tailnet, run:"
                echo "  docker exec -it codevault tailscale login"
                echo "-------------------------------------------------------"
                until ! tailscale status | grep -q "Logged out"; do sleep 2; done
            fi

            echo "Setting Tailscale hostname to 'codevault'..."
            tailscale up --hostname=codevault --reset --accept-dns=true

            echo "Starting Tailscale serve..."
            tailscale serve --https=443 off >/dev/null 2>&1
            tailscale serve --bg http://localhost:5174

            echo "-------------------------------------------------------"
            echo "CodeVault HTTPS ready: https://codevault.<tailnet>.ts.net"
            echo "-------------------------------------------------------"
        ) &
        ;;
esac

# Container exits when the server exits
wait "$SERVER_PID"
