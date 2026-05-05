#!/usr/bin/env bash
# =============================================================================
# redeploy.sh  —  Pull latest code, rebuild, restart API server.
# Called automatically by GitHub Actions on every push to main.
# Can also be run manually on the VPS: bash deploy/redeploy.sh
# =============================================================================
set -euo pipefail

DEPLOY_PATH="${DEPLOY_PATH:-$(cd "$(dirname "$0")/.." && pwd)}"
DATA_DIR="${DATA_DIR:-/var/data/bhishm}"
API_PORT="${API_PORT:-8080}"

cd "$DEPLOY_PATH"

echo "[redeploy] Pulling latest code..."
git pull

echo "[redeploy] Installing dependencies..."
pnpm install --frozen-lockfile

echo "[redeploy] Building API server..."
pnpm --filter @workspace/api-server run build

echo "[redeploy] Building frontend..."
PORT=3000 BASE_PATH=/ NODE_ENV=production \
  pnpm --filter @workspace/db-editor run build

echo "[redeploy] Writing .env ..."
cat > "$DEPLOY_PATH/artifacts/api-server/.env.runtime" <<EOF
PORT=$API_PORT
DATA_DIR=$DATA_DIR
NODE_ENV=production
SESSION_SECRET=${SESSION_SECRET:-$(openssl rand -hex 32)}
EOF

echo "[redeploy] Restarting API server via PM2..."
if pm2 list | grep -q bhishm-api; then
  pm2 restart bhishm-api
else
  pm2 start "$DEPLOY_PATH/artifacts/api-server/dist/index.mjs" \
    --name bhishm-api \
    --env-file "$DEPLOY_PATH/artifacts/api-server/.env.runtime" \
    --node-args="--enable-source-maps"
fi
pm2 save

echo "[redeploy] Done. API running on port $API_PORT."
