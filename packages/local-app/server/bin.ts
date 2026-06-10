#!/usr/bin/env node
import process from "node:process"
import { spawn, exec } from "node:child_process"
import { existsSync, readFileSync, writeFileSync, unlinkSync } from "node:fs"
import os from "node:os"
import path from "node:path"

const PID_FILE = path.join(os.tmpdir(), ".token-leaderboard.pid")

function readPid(): number | null {
  try {
    if (!existsSync(PID_FILE)) return null
    return parseInt(readFileSync(PID_FILE, "utf8").trim(), 10)
  } catch {
    return null
  }
}

function writePid(pid: number) {
  writeFileSync(PID_FILE, String(pid), "utf8")
}

function removePid() {
  try { unlinkSync(PID_FILE) } catch { /* ignore */ }
}

function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

function openBrowser(url: string) {
  const cmd = process.platform === "win32" ? `start "" "${url}"`
    : process.platform === "darwin" ? `open "${url}"`
    : `xdg-open "${url}"`
  exec(cmd)
}

// ── Subcommands ──

function cmdStop() {
  const pid = readPid()
  if (!pid) {
    console.log("No background process found.")
    process.exit(0)
  }
  if (!isProcessAlive(pid)) {
    removePid()
    console.log("Process already stopped.")
    process.exit(0)
  }
  try {
    process.kill(pid)
    removePid()
    console.log("TokenLeaderboard stopped.")
  } catch {
    console.error(`Failed to stop process ${pid}`)
    process.exit(1)
  }
  process.exit(0)
}

function cmdStatus() {
  const pid = readPid()
  if (!pid || !isProcessAlive(pid)) {
    removePid()
    console.log("TokenLeaderboard is not running.")
  } else {
    console.log(`TokenLeaderboard is running (PID ${pid}) at http://localhost:3001`)
  }
  process.exit(0)
}

function printHelp() {
  console.log(`token-leaderboard — Token Consumption Leaderboard

Usage:
  token-leaderboard          Start in background (default)
  token-leaderboard --fg     Start in foreground
  token-leaderboard stop     Stop background process
  token-leaderboard status   Check if running

Options:
  -p, --port <port>   Port to run on (default: 3001)
  --no-open           Don't auto-open browser
  --fg                Run in foreground
  -h, --help          Show this help message
`)
  process.exit(0)
}

// ── Parse args ──

const args = process.argv.slice(2)
let port = 3001
let shouldOpen = true
let foreground = false

// Subcommands
if (args[0] === "stop") { cmdStop() }
if (args[0] === "status") { cmdStatus() }

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
  } else if (args[i] === "--fg") {
    foreground = true
  } else if (args[i] === "--help" || args[i] === "-h") {
    printHelp()
  }
}

// ── Background launch ──

if (!foreground) {
  const existingPid = readPid()
  if (existingPid && isProcessAlive(existingPid)) {
    const url = `http://localhost:${port}`
    console.log(`Already running (PID ${existingPid}) at ${url}`)
    if (shouldOpen) openBrowser(url)
    process.exit(0)
  }
  removePid()

  // Re-spawn self with --fg
  const child = spawn(process.execPath, [
    ...process.argv.slice(1), "--fg", "--port", String(port),
  ], {
    detached: true,
    stdio: "ignore",
    windowsHide: true,
  })
  child.unref()

  const url = `http://localhost:${port}`
  console.log(`TokenLeaderboard started in background at ${url}`)
  console.log(`Use "token-leaderboard stop" to stop.`)

  if (shouldOpen) {
    setTimeout(() => openBrowser(url), 1000)
  }
  process.exit(0)
}

// ── Foreground: start server ──

import { startServer } from "./index.js"

writePid(process.pid)
process.on("exit", removePid)
process.on("SIGINT", () => process.exit(0))
process.on("SIGTERM", () => process.exit(0))

startServer(port)

if (shouldOpen) {
  const url = `http://localhost:${port}`
  setTimeout(() => openBrowser(url), 500)
}
