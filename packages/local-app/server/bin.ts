#!/usr/bin/env node
import process from "node:process"
import { spawn, exec } from "node:child_process"
import { existsSync, readFileSync, writeFileSync, unlinkSync } from "node:fs"
import { createRequire } from "node:module"
import net from "node:net"
import os from "node:os"
import path from "node:path"

const require = createRequire(import.meta.url)
const pkg = require("../package.json") as { version: string }

const PID_FILE = path.join(os.tmpdir(), ".tokboard.pid")
const DEFAULT_PORT = 7842
const PORT_RANGE = 50

function readPid(): number | null {
  try {
    if (!existsSync(PID_FILE)) return null
    return parseInt(readFileSync(PID_FILE, "utf8").trim().split("\n")[0], 10)
  } catch {
    return null
  }
}

function readPort(): number | null {
  try {
    if (!existsSync(PID_FILE)) return null
    const lines = readFileSync(PID_FILE, "utf8").trim().split("\n")
    return lines[1] ? parseInt(lines[1], 10) : null
  } catch {
    return null
  }
}

function writePid(pid: number, port: number) {
  writeFileSync(PID_FILE, `${pid}\n${port}`, "utf8")
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

function isPortFree(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const tester = net.createServer()
    let settled = false
    const finish = (free: boolean) => {
      if (settled) return
      settled = true
      tester.removeAllListeners()
      tester.close(() => resolve(free))
    }
    tester.once("error", () => finish(false))
    tester.once("listening", () => finish(true))
    tester.listen(port)
    // Safety timeout in case neither event fires
    setTimeout(() => finish(false), 1000)
  })
}

async function findFreePort(start: number): Promise<number> {
  for (let offset = 0; offset < PORT_RANGE; offset++) {
    const port = start + offset
    if (await isPortFree(port)) return port
  }
  throw new Error(`No free port found in range ${start}-${start + PORT_RANGE - 1}`)
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
    console.log("tokboard stopped.")
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
    console.log("tokboard is not running.")
  } else {
    const port = readPort() ?? DEFAULT_PORT
    console.log(`tokboard is running (PID ${pid}) at http://localhost:${port}`)
  }
  process.exit(0)
}

function printHelp() {
  console.log(`tokboard — Token Consumption Leaderboard

Usage:
  tokboard              Start in background (default)
  tokboard --fg         Start in foreground
  tokboard stop         Stop background process
  tokboard status       Check if running

Options:
  -p, --port <port>   Port to run on (default: ${DEFAULT_PORT})
  --no-open           Don't auto-open browser
  --fg                Run in foreground
  -v, --version       Print version and exit
  -h, --help          Show this help message
`)
  process.exit(0)
}

function printVersion() {
  console.log(`tokboard v${pkg.version}`)
  process.exit(0)
}

// ── Parse args ──

const args = process.argv.slice(2)
let port = DEFAULT_PORT
let shouldOpen = true
let foreground = false
let portExplicit = false

// Subcommands
if (args[0] === "stop") { cmdStop() }
if (args[0] === "status") { cmdStatus() }

for (let i = 0; i < args.length; i++) {
  if ((args[i] === "--port" || args[i] === "-p") && args[i + 1]) {
    const parsed = parseInt(args[i + 1], 10)
    if (isNaN(parsed)) {
      console.error("Error: --port must be a number")
      process.exit(1)
    }
    port = parsed
    portExplicit = true
    i++
  } else if (args[i] === "--no-open") {
    shouldOpen = false
  } else if (args[i] === "--fg") {
    foreground = true
  } else if (args[i] === "--help" || args[i] === "-h") {
    printHelp()
  } else if (args[i] === "--version" || args[i] === "-v") {
    printVersion()
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

  // Re-spawn self with --fg so the child owns the PID file
  const child = spawn(process.execPath, [
    ...process.argv.slice(1), "--fg", ...(portExplicit ? ["--port", String(port)] : []),
  ], {
    detached: true,
    stdio: "ignore",
    windowsHide: true,
  })
  child.unref()

  const url = `http://localhost:${port}`
  console.log(`tokboard started in background at ${url}`)
  console.log(`Use "tokboard stop" to stop.`)

  if (shouldOpen) {
    setTimeout(() => openBrowser(url), 1000)
  }
  process.exit(0)
}

// ── Foreground: start server ──

import { startServer } from "./index.js"

async function main() {
  const actualPort = portExplicit ? port : await findFreePort(port)
  const url = `http://localhost:${actualPort}`

  writePid(process.pid, actualPort)
  process.on("exit", removePid)
  process.on("SIGINT", () => process.exit(0))
  process.on("SIGTERM", () => process.exit(0))

  startServer(actualPort)

  if (actualPort !== port) {
    console.log(`(Port ${port} was busy, using ${actualPort} instead)`)
  }
  if (shouldOpen) {
    setTimeout(() => openBrowser(url), 500)
  }
}

main().catch((err) => {
  console.error(err.message)
  process.exit(1)
})