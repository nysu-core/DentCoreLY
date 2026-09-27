#!/usr/bin/env bash
# OrthoCore — Production Deployment Script
# Run this on your VPS after cloning the repository.
# Everything installed here is FREE and open source.
#
# Usage:
#   chmod +x deploy.sh
#   ./deploy.sh          ← first-time setup
#   ./deploy.sh update   ← pull latest code and restart

set -e
DEPLOY_DIR="/opt/orthocore"
NODE_MIN_VERSION=20

echo ""
echo "══════════════════════════════════════"
echo "  OrthoCore Production Deployment"
echo "══════════════════════════════════════"
echo ""

# ── Check Node.js ────────────────────────────────────────────────────────────
if ! command -v node &> /dev/null; then
  echo "❌  Node.js not found. Install Node.js $NODE_MIN_VERSION+ first:"
  echo "    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -"
  echo "    sudo apt-get install -y nodejs"
  exit 1
fi

NODE_VERSION=$(node -e "process.stdout.write(process.version.slice(1).split('.')[0])")
if [ "$NODE_VERSION" -lt "$NODE_MIN_VERSION" ]; then
  echo "❌  Node.js $NODE_MIN_VERSION+ required. Found: $(node --version)"
  exit 1
fi

echo "✓  Node.js $(node --version)"

# ── Install PM2 globally ─────────────────────────────────────────────────────
if ! command -v pm2 &> /dev/null; then
  echo "Installing PM2 (free, open source process manager)…"
  npm install -g pm2
fi
echo "✓  PM2 $(pm2 --version)"

# ── Backend ──────────────────────────────────────────────────────────────────
echo ""
echo "── Backend setup ─────────────────────"
cd "$DEPLOY_DIR/backend"

if [ ! -f ".env" ]; then
  echo "⚠️  No .env found. Creating from postgresql example…"
  cp .env.postgresql.example .env
  echo "❗ Edit $DEPLOY_DIR/backend/.env before continuing!"
  echo "   Set: DATABASE_URL, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET,"
  echo "        GMAIL_USER, GMAIL_APP_PASSWORD, APP_URL, ANON_SALT"
  exit 1
fi

npm ci --omit=dev
npm run prisma:generate
npm run prisma:migrate:deploy
npm run prisma:seed
npm run prisma:seed:forms
npm run build
echo "✓  Backend built"

# ── Frontend ──────────────────────────────────────────────────────────────────
echo ""
echo "── Frontend build ────────────────────"
cd "$DEPLOY_DIR/frontend"
npm ci --omit=dev
npm run build
echo "✓  Frontend built → dist/"

# ── Start / Restart PM2 ──────────────────────────────────────────────────────
echo ""
echo "── Process manager ───────────────────"
cd "$DEPLOY_DIR"
mkdir -p logs

if pm2 list | grep -q "orthocore-api"; then
  pm2 reload ecosystem.config.js --update-env
  echo "✓  PM2 process reloaded"
else
  pm2 start ecosystem.config.js
  pm2 save
  echo "✓  PM2 process started"
  echo ""
  echo "Enable auto-start on server reboot:"
  pm2 startup | tail -1
fi

echo ""
echo "══════════════════════════════════════"
echo "  ✅  OrthoCore is running!"
echo ""
echo "  API health:  curl http://localhost:4000/health"
echo "  Logs:        pm2 logs orthocore-api"
echo "  Status:      pm2 status"
echo ""
echo "  Next: configure Nginx using:"
echo "  nginx/orthocore.nginx.conf"
echo "══════════════════════════════════════"
echo ""
