# Token Leaderboard

Local token consumption dashboard for Claude Code users. Reads usage data via [ccusage](https://github.com/ryoppippi/ccusage) and visualizes it in a clean, single-page dashboard.

## Features

- **Daily / Monthly / Session / All Time** views with KPI cards
- Trend charts and model-level breakdowns
- Cost estimation alongside token counts
- File-based caching with background refresh for instant load
- Single binary — runs entirely on your machine, no server, no account
- Default sort by newest date first

## Quick Start

### Prerequisites

- Node.js 20+
- pnpm 9+
- [bun](https://bun.sh) (used to invoke `ccusage` via `bunx`)

### Install & Run

```bash
# Install dependencies
pnpm install

# Start the dashboard (frontend :5174 + local API :3001)
pnpm dev
```

Open <http://localhost:5174> in your browser. The first request triggers a `bunx ccusage@20.0.6` scan of your local Claude Code usage data; subsequent requests are served from a local cache.

### Install as a global CLI

```bash
# Build the package
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
2. Caches the result locally
3. Refreshes in the background on each request

To override `ccusage` options, pass query parameters (e.g. `?since=2026-01-01&until=2026-06-08`).

## API Endpoints

| Method | Endpoint       | Description                                       |
| ------ | -------------- | ------------------------------------------------- |
| GET    | `/api/daily`   | Daily aggregated token usage                       |
| GET    | `/api/monthly` | Monthly aggregated token usage                     |
| GET    | `/api/session` | Per-session token usage (derived from daily data)  |
| GET    | `/api/blocks`  | 5-hour billing-block usage (derived from daily)   |

## Development

```bash
pnpm dev                                         # Start dev mode (Vite HMR + tsx watch)
pnpm --filter token-leaderboard build            # Production build
```

### Tech Stack

- **Frontend**: React 19, React Router 7, Recharts, Tailwind CSS v4, lucide-react
- **Server**: Express 5, `bunx ccusage@20.0.6`, file-based JSON cache
- **Build**: Vite, TypeScript, pnpm workspaces

## Project Structure

```
packages/local-app/
├── src/                     # React frontend
│   ├── components/
│   │   ├── dashboard/       # Charts, tables, KPIs
│   │   ├── layout/          # Navbar, Header
│   │   └── ui/              # Shared primitives
│   ├── pages/               # HomePage
│   └── lib/                 # api.ts, types.ts, format.ts
└── server/                  # Local Express server
    ├── bin.ts               # Production entry
    ├── index.ts             # App factory
    ├── routes.ts            # /api/{daily,monthly,session,blocks}
    ├── cache.ts             # File-based daily cache
    └── ccusage.ts           # bunx ccusage wrapper
```

## Publishing

Push a `v*` tag to trigger the GitHub Actions workflow for automatic npm publishing:

```bash
git tag v2.0.1
git push origin v2.0.1
```

## Uninstall

```bash
npm uninstall -g token-leaderboard
```

## License

MIT
