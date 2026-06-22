# Tokboard

> A local-first token consumption dashboard for Claude Code (and friends).
> One command, no cloud, no signup — just a clean dashboard for your usage.

<p align="left">
  <a href="https://www.npmjs.com/package/token-leaderboard"><img alt="npm version" src="https://img.shields.io/npm/v/token-leaderboard?color=yellow" /></a>
  <a href="https://nodejs.org"><img alt="node" src="https://img.shields.io/badge/node-%E2%89%A518-339933?logo=node.js&logoColor=white" /></a>
  <a href="LICENSE"><img alt="license" src="https://img.shields.io/badge/license-MIT-blue.svg" /></a>
</p>

![Tokboard dashboard – Daily view](docs/screenshots/daily.png)

## What is Tokboard?

Tokboard turns the JSONL logs that Claude Code (and other AI CLIs) write under `~/.claude/projects/` into a friendly dashboard you can open in your browser.

It runs a tiny background process on your machine, talks to [`ccusage`](https://github.com/ryoppippi/ccusage) to crunch the numbers, and renders four different views of your token & cost data — all without sending anything to a server.

- **Read-only** — never modifies your CLI logs
- **Local-only** — your data never leaves your laptop
- **Persistent** — runs in the background, close the terminal and the dashboard stays up

## Screenshots

| Daily (AI Leverage) | Monthly |
| :---: | :---: |
| ![Daily view with AI Leverage ring, history and trend chart](docs/screenshots/daily.png) | ![Monthly view with KPI cards and monthly data table](docs/screenshots/monthly.png) |
| A three-ring **AI Leverage** widget tracks your daily goal, deep-work score and consistency, with a 14-day rolling history. | KPI cards surface totals for the month; switch the trend to **Cost** to see USD over time. |

| All Time | Custom Range |
| :---: | :---: |
| ![All Time view with cumulative totals across all dates](docs/screenshots/alltime.png) | ![Custom Range with date pickers for filtering](docs/screenshots/custom.png) |
| Every day you've ever used Claude Code, paginated and sortable. | Pick any two dates — useful for sprint reviews or weekly check-ins. |

## Install

```bash
npm install -g token-leaderboard
```

Requirements: **Node.js 18+**. That's it — `ccusage` ships as a dependency, no extra tooling needed.

## Usage

```bash
# Start the dashboard in the background — auto-opens your browser
tokboard

# …that's it. Use the dashboard, close the terminal, it stays running.
```

### Commands

| Command | What it does |
| --- | --- |
| `tokboard` | Start in background, open browser at <http://localhost:7842> |
| `tokboard stop` | Stop the background process |
| `tokboard status` | Check if it's currently running |
| `tokboard --fg` | Run in the foreground (Ctrl+C to stop) — useful for debugging |
| `tokboard --port 8080` | Use a different port |
| `tokboard --no-open` | Don't auto-open the browser |
| `tokboard -h` | Show all options |

> Tokboard listens on port **7842** by default. If that port is busy, it automatically picks the next free one in the range 7842–7891 and prints the actual URL in the terminal.

### Views at a glance

- **Daily** — your **AI Leverage** ring (volume / deep-work / consistency), plus a sortable table for every day. Default sort is newest first.
- **Monthly** — totals per month with a trend chart you can flip between tokens and cost.
- **Custom Range** — pick any two dates, see only that window.
- **All Time** — every entry across your entire history.

Click any row in the data table to expand the **per-model breakdown** (Opus vs Sonnet vs whatever else you used that day).

## License

MIT
