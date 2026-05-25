#!/bin/sh

if [ "$NODE_ENV" != "production" ] && [ ! -d "node_modules" ]; then
    echo "node_modules not found. Installing..."
    npm install
fi

if [ "$NODE_ENV" = "production" ]; then
    node server/index.js &
else
    npm run dev &
fi
SERVER_PID=$!

until nc -z 127.0.0.1 5174; do sleep 1; done
echo "-------------------------------------------------------"
echo "CodeVault ready: http://localhost:5174"
echo "-------------------------------------------------------"

case "${TAILSCALE:-1}" in
    0|false) ;;
    *)
        (
            if [ -e /dev/net/tun ]; then
                tailscaled --socket=/var/run/tailscale/tailscaled.sock &
            else
                tailscaled --tun=userspace-networking --socket=/var/run/tailscale/tailscaled.sock &
            fi
            until [ -S /var/run/tailscale/tailscaled.sock ]; do sleep 0.5; done

            if tailscale status | grep -q "Logged out"; then
                echo "-------------------------------------------------------"
                echo "Tailscale: not logged in. localhost:5174 is already available."
                echo "To enable HTTPS: docker exec -it codevault tailscale login"
                echo "-------------------------------------------------------"
                until ! tailscale status | grep -q "Logged out"; do sleep 2; done
            fi

            tailscale up --hostname=codevault --accept-dns=true

            if [ -e /dev/net/tun ]; then
                tailscale serve --https=443 off >/dev/null 2>&1
                tailscale serve --bg http://localhost:5174
                echo "-------------------------------------------------------"
                echo "CodeVault HTTPS ready: https://codevault.<tailnet>.ts.net"
                echo "-------------------------------------------------------"
            else
                echo "-------------------------------------------------------"
                echo "Tailscale: userspace mode — HTTPS unavailable (no /dev/net/tun)."
                echo "App available at http://localhost:5174"
                echo "-------------------------------------------------------"
            fi
        ) &
        ;;
esac

wait "$SERVER_PID"
