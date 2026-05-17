#!/bin/bash
# Deploy script for Token Consumption Leaderboard v2
# Run on the Ubuntu server (124.220.17.38)

set -e

echo "=== Installing system dependencies ==="

# Install Node.js 20
if ! command -v node &> /dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi

# Install pnpm
if ! command -v pnpm &> /dev/null; then
  npm install -g pnpm
fi

# Install PostgreSQL 16
if ! command -v psql &> /dev/null; then
  sudo apt-get install -y postgresql postgresql-contrib
  sudo systemctl enable postgresql
  sudo systemctl start postgresql
fi

# Install Nginx
if ! command -v nginx &> /dev/null; then
  sudo apt-get install -y nginx
  sudo systemctl enable nginx
  sudo systemctl start nginx
fi

# Install pm2
if ! command -v pm2 &> /dev/null; then
  npm install -g pm2
fi

echo "=== Setting up PostgreSQL ==="

# Create database and user (run once)
sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname = 'leaderboard'" | grep -q 1 || \
  sudo -u postgres psql -c "CREATE USER leaderboard WITH PASSWORD 'CHANGE_ME';"

sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw leaderboard || \
  sudo -u postgres psql -c "CREATE DATABASE leaderboard OWNER leaderboard;"

echo "=== Installing dependencies ==="

pnpm install

echo "=== Building remote server ==="

pnpm build:server

echo "=== Running database migrations ==="

cd packages/server
pnpm migrate
cd ../..

echo "=== Building remote frontend ==="

VITE_APP_MODE=remote pnpm --filter local-app build

echo "=== Deploying static files ==="

sudo mkdir -p /var/www/token-leaderboard
sudo cp -r packages/local-app/dist /var/www/token-leaderboard/

echo "=== Configuring Nginx ==="

sudo cp nginx.conf /etc/nginx/sites-available/token-leaderboard
sudo ln -sf /etc/nginx/sites-available/token-leaderboard /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

echo "=== Starting server with pm2 ==="

pm2 delete token-leaderboard 2>/dev/null || true
pm2 start ecosystem.config.cjs
pm2 save

echo "=== Deployment complete! ==="
echo "Server: http://124.220.17.38"
echo ""
echo "IMPORTANT: Edit ecosystem.config.cjs to set your environment variables:"
echo "  - DATABASE_URL"
echo "  - JWT_SECRET"
echo "  - GITHUB_CLIENT_ID  (create OAuth App at https://github.com/settings/developers)"
echo "  - GITHUB_CLIENT_SECRET"
echo "  - SMTP_USER / SMTP_PASS  (already configured)"
