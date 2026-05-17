# Token Consumption Leaderboard

A token usage tracking and ranking platform for AI developers. Tracks your Claude Code token consumption via [ccusage](https://github.com/pgib/ccusage) and displays it on a global leaderboard.

## Architecture

```
packages/
├── local-app/          # Local dashboard + shared frontend
│   ├── src/            # React frontend (dashboard, leaderboard, auth, settings)
│   └── server/         # Express server (ccusage wrapper, caching, auto-submit worker)
└── server/             # Remote API server
    └── src/            # Express + PostgreSQL (auth, leaderboard, profile, submit)
```

**Dual-mode frontend**:
- **Local mode** (`pnpm dev`): Full dashboard with ccusage integration + leaderboard + settings
- **Remote mode** (`VITE_APP_MODE=remote`): Leaderboard + login + profile (deployed on server)

## Features

- **Local Dashboard**: Daily/monthly/session/blocks views with KPI cards, trend charts, and model-level breakdowns
- **Global Leaderboard**: Time-period rankings (1d/7d/30d/all-time), sorted by tokens or cost
- **User Profiles**: Public profile pages with submitted data
- **Authentication**: GitHub OAuth + Email/password with verification codes
- **Auto-submit**: Background worker that periodically sends your data to the leaderboard
- **API Tokens**: `tl_` prefixed tokens for background data submission

## Quick Start

### Prerequisites

- Node.js 20+
- pnpm 9+
- PostgreSQL 16+ (for remote server)

### Local Development

```bash
# Install dependencies
pnpm install

# Start local dashboard (frontend + local API server)
pnpm dev
```

Open http://localhost:5173 to see your local token dashboard.

### Remote Server Deployment

See [Deployment](#deployment) section below.

## Configuration

### Environment Variables

#### Remote Server (`packages/server/.env`)

```bash
PORT=3000
NODE_ENV=production

# PostgreSQL
DATABASE_URL=postgresql://leaderboard:PASSWORD@localhost:5432/leaderboard

# JWT
JWT_SECRET=your-random-secret-string

# GitHub OAuth (see setup below)
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret

# Email (163 SMTP)
SMTP_HOST=smtp.163.com
SMTP_PORT=465
SMTP_USER=your-email@163.com
SMTP_PASS=your-smtp-authorization-code

# Frontend URL (for CORS and OAuth redirects)
FRONTEND_URL=https://124.220.17.38
```

### GitHub OAuth Setup

The GitHub OAuth 404 error occurs when `GITHUB_CLIENT_ID` is not configured. To fix this:

1. Go to **https://github.com/settings/developers**
2. Click **"New OAuth App"**
3. Fill in:
   - **Application name**: `Token Consumption Leaderboard`
   - **Homepage URL**: `https://124.220.17.38`
   - **Authorization callback URL**: `https://124.220.17.38/api/auth/github/callback`
4. Click **"Register application"**
5. Copy the **Client ID** and generate a **Client Secret**
6. Update `ecosystem.config.cjs` on the server:
   ```
   GITHUB_CLIENT_ID: "your-client-id",
   GITHUB_CLIENT_SECRET: "your-client-secret",
   ```
7. Restart the server: `pm2 restart token-leaderboard`

### 163 Email SMTP Setup

Registration sends verification codes via 163 SMTP. To configure:

1. Log in to your 163 email at https://mail.163.com
2. Go to **Settings** → **POP3/SMTP/IMAP**
3. Enable **SMTP** service
4. Generate an **authorization code** (授权码) — this is NOT your login password
5. Update `ecosystem.config.cjs` on the server:
   ```
   SMTP_USER: "your-email@163.com",
   SMTP_PASS: "your-authorization-code",
   ```
6. Restart the server: `pm2 restart token-leaderboard`

## Deployment

### Full Deployment (first time)

Run `deploy.sh` on the Ubuntu server:

```bash
# 1. Clone the repo on the server
git clone <your-repo-url>
cd Token-Consumption-Leaderboard

# 2. Edit ecosystem.config.cjs with your production values
vim ecosystem.config.cjs
# Set: DATABASE_URL, JWT_SECRET, GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET

# 3. Run deployment
bash deploy.sh
```

This installs Node.js, PostgreSQL, Nginx, pm2, runs migrations, builds, and starts the server.

### HTTPS Setup

```bash
# Run on the server
bash setup-https.sh
```

This generates a self-signed SSL certificate and configures Nginx for HTTPS.

**For a trusted certificate** (requires a domain name):
1. Point your domain DNS to `124.220.17.38`
2. Run: `sudo certbot certonly --webroot -w /var/www/certbot -d your-domain.com`
3. Update `nginx.conf` with your domain name
4. Reload: `sudo systemctl reload nginx`

### Update Deployment

```bash
git pull
pnpm install
pnpm build:server
VITE_APP_MODE=remote pnpm --filter local-app build
sudo cp -r packages/local-app/dist /var/www/token-leaderboard/
pm2 restart token-leaderboard
```

## Development

```bash
pnpm dev              # Local dashboard (frontend :5173 + local API :3001)
pnpm dev:server       # Remote API server only (:3000)
pnpm build            # Build local-app
pnpm build:remote     # Build remote frontend (VITE_APP_MODE=remote)
pnpm build:server     # Build server TypeScript
```

### Tech Stack

- **Frontend**: React 19, React Router 7, Recharts, Tailwind CSS v4, Base UI
- **Local Server**: Express 5, ccusage CLI wrapper, file-based caching
- **Remote Server**: Express 5, PostgreSQL 16, JWT auth, Nodemailer
- **Build**: Vite, TypeScript, pnpm workspaces
- **Deploy**: Nginx, pm2, Ubuntu

### Running Tests

```bash
# Install Playwright browsers (first time)
pnpm exec playwright install

# Run all E2E tests
pnpm test

# Run specific test suites
pnpm test:server      # Remote server API tests
pnpm test:remote      # Remote frontend tests
pnpm test:local       # Local dashboard tests
pnpm test:settings    # Settings API tests
```

## Project Structure

```
├── deploy.sh                  # Full deployment script
├── setup-https.sh             # HTTPS certificate setup
├── nginx.conf                 # Nginx config (HTTPS + reverse proxy)
├── ecosystem.config.cjs       # pm2 process config with env vars
├── playwright.config.ts       # E2E test configuration
├── e2e/                       # Playwright E2E tests
│   ├── server-api.spec.ts     # Remote API endpoint tests
│   ├── remote-frontend.spec.ts# Remote frontend UI tests
│   ├── local-dashboard.spec.ts# Local dashboard UI tests
│   └── settings-api.spec.ts   # Settings API tests
└── packages/
    ├── local-app/
    │   ├── src/               # React frontend
    │   │   ├── components/    # UI components (auth, dashboard, layout, ui)
    │   │   ├── pages/         # Page components
    │   │   ├── hooks/         # Custom hooks
    │   │   └── lib/           # API clients, types, utilities
    │   └── server/            # Express local server
    │       ├── index.ts       # App entry
    │       ├── routes.ts      # ccusage API routes
    │       ├── settings-routes.ts
    │       ├── settings-store.ts
    │       ├── submit-worker.ts  # Background auto-submit
    │       ├── cache.ts       # File-based caching
    │       └── ccusage.ts     # ccusage CLI wrapper
    └── server/
        └── src/
            ├── index.ts       # App entry
            ├── routes/        # API routes (auth, leaderboard, profile, submit)
            ├── services/      # Email, leaderboard cache
            ├── middleware/     # JWT + API token auth
            ├── utils/         # JWT utilities
            └── db/
                ├── client.ts  # PostgreSQL connection
                ├── migrate.ts # Migration runner
                └── migrations/ # SQL migrations
```

## API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/auth/github` | Redirect to GitHub OAuth |
| GET | `/api/auth/github/callback` | OAuth callback |
| POST | `/api/auth/register` | Email registration (sends verification code) |
| POST | `/api/auth/verify-email` | Verify email and create account |
| POST | `/api/auth/login` | Email/password login |
| GET | `/api/auth/me` | Get current user info |
| POST | `/api/auth/api-token` | Generate API token |

### Leaderboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/leaderboard` | Get rankings (params: period, sort, page, limit) |

### Profile
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/profile/:username` | Get user profile |
| GET | `/api/profile/:username/data` | Get user submitted data |

### Submit
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/submit` | Submit token data (JWT or API token auth) |

### Health
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Server health check |
