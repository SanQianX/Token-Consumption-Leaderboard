# TokenMeter

Local token consumption dashboard for Claude Code users. Reads usage data via [ccusage](https://github.com/ryoppippi/ccusage) and visualizes it in a clean, single-page dashboard.

![Dashboard](screenshots/dashboard-loaded.png)

## Features

- **Daily / Monthly / Session / All Time** views with KPI cards
- Trend charts and model-level breakdowns
- Cost estimation alongside token counts
- File-based caching with background refresh for instant load
- Single binary — runs entirely on your machine, no server, no account

## Quick Start

### Prerequisites

- Node.js 20+
- pnpm 9+ (or use `npx`)
- [bun](https://bun.sh) (used to invoke `ccusage` via `bunx`)

### Install & Run

```bash
# 1. Install dependencies
pnpm install

# 2. Start the dashboard (frontend :5173 + local API :3001)
pnpm dev
```

Open <http://localhost:5173> in your browser. The first request triggers a `bunx ccusage@20.0.6` scan of your local Claude Code usage data; subsequent requests are served from a local cache.

### Install as a global CLI

```bash
# Build the local-app package
pnpm --filter token-leaderboard build

# Install globally
npm install -g ./packages/local-app

# Run from anywhere
token-leaderboard
# → TokenMeter running at http://localhost:3001
```

The production build serves both the API and the static frontend from a single Express process on port 3001.

## Configuration

No configuration is required. The local API automatically:

1. Invokes `bunx ccusage@20.0.6 daily` to gather usage data
2. Caches the result at `~/.token-leaderboard/daily.json`
3. Refreshes in the background on each request

To override `ccusage` options, pass query parameters (e.g. `?since=2026-01-01&until=2026-06-08`).

## API Endpoints

| Method | Endpoint     | Description                                       |
| ------ | ------------ | ------------------------------------------------- |
| GET    | `/api/daily`   | Daily aggregated token usage (last 41 days)        |
| GET    | `/api/monthly` | Monthly aggregated token usage                     |
| GET    | `/api/session` | Per-session token usage (derived from daily data)  |
| GET    | `/api/blocks`  | 5-hour billing-block usage (derived from daily)   |

All endpoints are served by the local Express server on port 3001.

## Development

```bash
pnpm dev                    # Start dev mode (Vite HMR + tsx watch)
pnpm --filter token-leaderboard build  # Production build (dist + dist-server)
pnpm test                   # Run Playwright E2E tests
```

### Tech Stack

- **Frontend**: React 19, React Router 7, Recharts, Tailwind CSS v4, lucide-react
- **Local Server**: Express 5, `bunx ccusage@20.0.6`, file-based JSON cache
- **Build**: Vite, TypeScript, pnpm workspaces
- **E2E**: Playwright

## Project Structure

```
.
├── README.md
├── package.json                 # Root workspace
├── pnpm-workspace.yaml
├── playwright.config.ts
├── .github/workflows/           # CI (npm publish)
├── packages/
│   └── local-app/               # The whole app
│       ├── package.json         # name: "token-leaderboard"
│       ├── bin: token-leaderboard → dist-server/bin.js
│       ├── src/                 # React frontend
│       │   ├── components/
│       │   │   ├── dashboard/   # Charts, tables, KPIs
│       │   │   ├── layout/      # Navbar, Header
│       │   │   └── ui/          # Shared primitives
│       │   ├── pages/           # HomePage
│       │   └── lib/             # api.ts, types.ts, format.ts
│       └── server/              # Local Express server
│           ├── bin.ts           # Production entry
│           ├── index.ts         # App factory
│           ├── routes.ts        # /api/{daily,monthly,session,blocks}
│           ├── cache.ts         # File-based daily cache
│           └── ccusage.ts       # bunx ccusage wrapper
├── e2e/
│   └── local-dashboard.spec.ts  # Playwright tests
└── screenshots/                 # E2E screenshots (gitignored)
```

## Uninstall

```bash
npm uninstall -g token-leaderboard
```

To also remove local cache:

```bash
rm -rf ~/.token-leaderboard
```

## License

MIT
