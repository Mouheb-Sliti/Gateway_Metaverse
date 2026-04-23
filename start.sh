#!/bin/sh
set -e

# -------------------------------------------------------
# Startup script for Metaverse Gateway
# Runs Node.js Express Gateway behind Nginx reverse proxy
#
# OpenShift compatible: runs as arbitrary UID, no su/sudo
# -------------------------------------------------------

NODE_APP_DIR="/usr/src/app"
NODE_PORT="${HTTP_PORT:-3000}"

echo "[start.sh] Running as UID=$(id -u), GID=$(id -g)"

# Start Node.js directly as the current user (OpenShift assigns arbitrary UID)
echo "[start.sh] Starting Node.js Express Gateway on port ${NODE_PORT}..."
cd "${NODE_APP_DIR}" && HTTP_PORT="${NODE_PORT}" NODE_ENV=production node server.js &
NODE_PID=$!

# Wait for Node.js to be ready
echo "[start.sh] Waiting for Node.js to become ready..."
RETRIES=30
until wget -q --spider "http://127.0.0.1:${NODE_PORT}/" 2>/dev/null || [ "$RETRIES" -eq 0 ]; do
  # Check if Node.js process is still alive
  if ! kill -0 "$NODE_PID" 2>/dev/null; then
    echo "[start.sh] ERROR: Node.js process exited unexpectedly"
    break
  fi
  RETRIES=$((RETRIES - 1))
  sleep 1
done

if [ "$RETRIES" -eq 0 ]; then
  echo "[start.sh] WARNING: Node.js did not respond within 30s, starting nginx anyway..."
else
  echo "[start.sh] Node.js is ready (PID=${NODE_PID})."
fi

# Start Nginx in foreground
echo "[start.sh] Starting Nginx..."
exec nginx -g "daemon off;"
