# Token Leaderboard

Local token consumption dashboard for Claude Code users. Reads usage data via [ccusage](https://github.com/ryoppippi/ccusage) and visualizes it in a clean, single-page dashboard.

**No Bun required** — only Node.js is needed. `ccusage` is included as a dependency, invoked via `npx`.

## Features

- **Daily / Monthly / Session / All Time** views with KPI cards
- Trend charts and model-level breakdowns
- Cost estimation alongside token counts
- File-based caching with background refresh for instant load
- Runs in background by default — close the terminal and it stays alive
- Default sort by newest date first
- Single package — `npm install -g` and go

## Quick Start

### Prerequisites

- Node.js 18+

### Install as a global CLI

```bash
npm install -g token-leaderboard
```

### Usage

```bash
# Start in background (default) — opens browser, terminal can be closed
token-leaderboard

# Stop the background server
token-leaderboard stop

# Check if running
token-leaderboard status

# Run in foreground (for debugging)
token-leaderboard --fg

# Use a custom port
token-leaderboard --port 8080

# Don't auto-open browser
token-leaderboard --no-open
```

| Command | Description |
|---------|-------------|
| `token-leaderboard` | Start in background, auto-open browser |
| `token-leaderboard stop` | Stop the background process |
| `token-leaderboard status` | Check if the server is running |
| `token-leaderboard --fg` | Run in foreground (Ctrl+C to stop) |
| `token-leaderboard --no-open` | Start without opening the browser |
| `token-leaderboard -p 8080` | Use a custom port |

The production build serves both the API and the static frontend from a single Express process on port 3001.

### Development

```bash
# Prerequisites: Node.js 18+, pnpm 9+

# Install dependencies
pnpm install

# Start dev mode (Vite HMR on :5174 + Express API on :3001)
pnpm dev

# Production build
pnpm --filter token-leaderboard build
```

## Configuration

No configuration is required. The local API automatically:

1. Invokes `npx ccusage@20.0.6 daily` to gather usage data
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

## Tech Stack

- **Frontend**: React 19, React Router 7, Recharts, Tailwind CSS v4, lucide-react
- **Server**: Express 5, `npx ccusage@20.0.6`, file-based JSON cache
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
    ├── bin.ts               # CLI entry (background/foreground mode)
    ├── index.ts             # App factory
    ├── routes.ts            # /api/{daily,monthly,session,blocks}
    ├── cache.ts             # File-based daily cache
    └── ccusage.ts           # npx ccusage wrapper
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
