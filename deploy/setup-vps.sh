#!/usr/bin/env bash
# =============================================================================
# setup-vps.sh  —  One-time VPS setup script for DB BHISHM TABLET
# Run this ONCE on a fresh Hostinger VPS as root (or with sudo).
# =============================================================================
set -euo pipefail

DEPLOY_PATH="${DEPLOY_PATH:-/var/www/bhishm}"
DATA_DIR="${DATA_DIR:-/var/data/bhishm}"
APP_USER="${APP_USER:-bhishm}"
REPO_URL="${REPO_URL:-}"   # set via env: REPO_URL=https://github.com/you/repo bash setup-vps.sh

echo "========================================"
echo "  DB BHISHM TABLET — VPS Setup"
echo "========================================"

# ── 1. System packages ─────────────────────────────────────────────────────
apt-get update -y
apt-get install -y curl git nginx certbot python3-certbot-nginx ufw

# ── 2. Node.js 24 via fnm ──────────────────────────────────────────────────
if ! command -v node &>/dev/null || [[ "$(node -e 'console.log(process.version.split(".")[0].slice(1))')" -lt 24 ]]; then
  curl -fsSL https://fnm.vercel.app/install | bash
  export FNM_DIR="$HOME/.local/share/fnm"
  export PATH="$FNM_DIR:$PATH"
  eval "$(fnm env)"
  fnm install 24
  fnm use 24
  fnm default 24
  # Make node/npm available system-wide
  NODE_BIN=$(fnm exec --using=24 which node)
  ln -sf "$NODE_BIN" /usr/local/bin/node
  NPM_BIN=$(fnm exec --using=24 which npm)
  ln -sf "$NPM_BIN" /usr/local/bin/npm
fi

# ── 3. pnpm ────────────────────────────────────────────────────────────────
npm install -g pnpm pm2
pnpm --version

# ── 4. App user (non-root for running the process) ─────────────────────────
if ! id "$APP_USER" &>/dev/null; then
  useradd -m -s /bin/bash "$APP_USER"
fi

# ── 5. Persistent data directory ───────────────────────────────────────────
mkdir -p "$DATA_DIR/user_dbs"
chown -R "$APP_USER:$APP_USER" "$DATA_DIR"

# ── 6. Clone repo ──────────────────────────────────────────────────────────
mkdir -p "$DEPLOY_PATH"
if [[ -n "$REPO_URL" ]]; then
  git clone "$REPO_URL" "$DEPLOY_PATH"
fi
chown -R "$APP_USER:$APP_USER" "$DEPLOY_PATH"

# ── 7. First build ─────────────────────────────────────────────────────────
cd "$DEPLOY_PATH"
sudo -u "$APP_USER" bash deploy/redeploy.sh

# ── 8. nginx config ────────────────────────────────────────────────────────
cp deploy/nginx.conf /etc/nginx/sites-available/bhishm
ln -sf /etc/nginx/sites-available/bhishm /etc/nginx/sites-enabled/bhishm
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# ── 9. Firewall ────────────────────────────────────────────────────────────
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

echo ""
echo "========================================"
echo "  Setup complete!"
echo "  Next step: point your domain DNS to this server's IP."
echo "  Then run: certbot --nginx -d yourdomain.com"
echo "========================================"
