#!/bin/bash
# Setup script for remote server — run on 124.220.17.38
# This sets up PostgreSQL, creates the test user, and starts the server

set -e

echo "=== Step 1: Install PostgreSQL 16 ==="
if ! command -v psql &> /dev/null; then
  sudo apt-get update
  sudo apt-get install -y curl ca-certificates
  sudo install -d /usr/share/postgresql-common/pgdg
  sudo curl -o /usr/share/postgresql-common/pgdg/apt.postgresql.org.asc --fail https://www.postgresql.org/media/keys/ACCC4CF8.asc
  sudo sh -c 'echo "deb [signed-by=/usr/share/postgresql-common/pgdg/apt.postgresql.org.asc] https://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
  sudo apt-get update
  sudo apt-get install -y postgresql-16 postgresql-contrib-16
  sudo systemctl enable postgresql
  sudo systemctl start postgresql
  echo "PostgreSQL 16 installed."
else
  echo "PostgreSQL already installed: $(psql --version)"
fi

echo ""
echo "=== Step 2: Create database and user ==="
sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname = 'leaderboard'" | grep -q 1 || \
  sudo -u postgres psql -c "CREATE USER leaderboard WITH PASSWORD 'leaderboard_dev_2024';"

sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw leaderboard || \
  sudo -u postgres psql -c "CREATE DATABASE leaderboard OWNER leaderboard;"

echo "Database 'leaderboard' and user 'leaderboard' ready."

echo ""
echo "=== Step 3: Run database migrations ==="
export DATABASE_URL="postgresql://leaderboard:leaderboard_dev_2024@localhost:5432/leaderboard"

# Run the initial migration
sudo -u postgres psql -d leaderboard -f packages/server/src/db/migrations/001_initial.sql
echo "Migration complete."

echo ""
echo "=== Step 4: Create test user ==="
# Generate a bcrypt hash for password 'test123456'
# We'll use Node.js for this
TEST_PASSWORD_HASH=$(node -e "const bcrypt = require('bcryptjs'); console.log(bcrypt.hashSync('test123456', 10));")

sudo -u postgres psql -d leaderboard -c "
INSERT INTO users (username, email, email_verified, password_hash, auth_provider)
VALUES ('e2e_tester', 'e2e-test@test.com', TRUE, '${TEST_PASSWORD_HASH}', 'email')
ON CONFLICT (email) DO NOTHING;
"

echo "Test user created: e2e-test@test.com / test123456"

echo ""
echo "=== Step 5: Install Node.js and pnpm ==="
if ! command -v node &> /dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi
echo "Node: $(node --version)"

if ! command -v pnpm &> /dev/null; then
  npm install -g pnpm
fi
echo "pnpm: $(pnpm --version)"

if ! command -v pm2 &> /dev/null; then
  npm install -g pm2
fi
echo "pm2: $(pm2 --version)"

echo ""
echo "=== Step 6: Install dependencies and build ==="
pnpm install
pnpm build:server

echo ""
echo "=== Step 7: Configure and start server with pm2 ==="

# Create/update .env file
cat > packages/server/.env << 'EOF'
PORT=3000
NODE_ENV=production
DATABASE_URL=postgresql://leaderboard:leaderboard_dev_2024@localhost:5432/leaderboard
JWT_SECRET=e2e-test-jwt-secret-change-in-production
FRONTEND_URL=https://124.220.17.38
SMTP_HOST=smtp.163.com
SMTP_PORT=465
SMTP_USER=xyl20000810@163.com
SMTP_PASS=KDgGLC5T2RjTv8U4
EOF

# Stop any existing process
pm2 delete token-leaderboard 2>/dev/null || true

# Start with pm2
pm2 start packages/server/dist/index.js --name token-leaderboard --env production
pm2 save

echo ""
echo "=== Waiting for server to start ==="
sleep 3

# Health check
HEALTH=$(curl -s http://localhost:3000/api/health)
echo "Health check: $HEALTH"

echo ""
echo "=== Setup Complete! ==="
echo ""
echo "Server: http://124.220.17.38"
echo "Test user: e2e-test@test.com / test123456"
echo ""
echo "Run E2E tests from your local machine:"
echo "  pnpm exec playwright install"
echo "  pnpm test:server"
