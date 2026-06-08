#!/usr/bin/env node
import process from "node:process"
import { exec } from "node:child_process"
import { startServer } from "./index.js"

const args = process.argv.slice(2)
let port = 3001
let shouldOpen = true

for (let i = 0; i < args.length; i++) {
  if ((args[i] === "--port" || args[i] === "-p") && args[i + 1]) {
    port = parseInt(args[i + 1], 10)
    if (isNaN(port)) {
      console.error("Error: --port must be a number")
      process.exit(1)
    }
    i++
  } else if (args[i] === "--no-open") {
    shouldOpen = false
  } else if (args[i] === "--help" || args[i] === "-h") {
    console.log(`token-leaderboard — Token Consumption Leaderboard

Usage: token-leaderboard [options]

Options:
  -p, --port <port>   Port to run on (default: 3001)
  --no-open           Don't auto-open browser
  -h, --help          Show this help message
`)
    process.exit(0)
  }
}

startServer(port)

if (shouldOpen) {
  const url = `http://localhost:${port}`
  const cmd = process.platform === "win32" ? `start "" "${url}"`
    : process.platform === "darwin" ? `open "${url}"`
    : `xdg-open "${url}"`
  setTimeout(() => exec(cmd), 500)
}
