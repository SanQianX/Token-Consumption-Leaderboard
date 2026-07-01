# Tokboard

Tokboard is a local-first token consumption dashboard for Claude Code and other
AI CLI workflows. It reads local usage logs, aggregates them with `ccusage`, and
opens a browser dashboard on your machine.

## Install

```bash
npm install -g token-leaderboard
tokboard
```

Try without installing globally:

```bash
npx token-leaderboard
```

## Commands

| Command | What it does |
| --- | --- |
| `tokboard` | Start in the background and open the dashboard |
| `tokboard stop` | Stop the background process |
| `tokboard status` | Show whether Tokboard is running |
| `tokboard --fg` | Run in the foreground |
| `tokboard --port 8080` | Use a specific port |
| `tokboard --no-open` | Start without opening a browser |
| `tokboard -h` | Show help |

## Privacy

Tokboard runs locally and does not require a Tokboard account, hosted backend,
telemetry service, database, or API key. It reads local Claude Code logs under
`~/.claude/projects/` in read-only mode.

## Links

- Source: https://github.com/SanQianX/Token-Consumption-Leaderboard
- Issues: https://github.com/SanQianX/Token-Consumption-Leaderboard/issues
- License: Apache-2.0
