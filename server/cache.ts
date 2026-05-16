import { readFile, writeFile, mkdir } from "node:fs/promises"
import { join } from "node:path"
import { existsSync } from "node:fs"
import { runCcusage, type CcusageOptions } from "./ccusage.js"

interface CacheEntry {
  data: unknown
  updatedAt: string
}

const CACHE_DIR = join(import.meta.dirname, "..", ".cache")

async function ensureCacheDir() {
  if (!existsSync(CACHE_DIR)) {
    await mkdir(CACHE_DIR, { recursive: true })
  }
}

function cachePath(command: string, options: CcusageOptions): string {
  const key = [command, options.since, options.until, options.project, options.offline ? "offline" : ""]
    .filter(Boolean)
    .join("-")
  return join(CACHE_DIR, `${key}.json`)
}

export async function readCache(command: string, options: CcusageOptions): Promise<CacheEntry | null> {
  try {
    const raw = await readFile(cachePath(command, options), "utf-8")
    return JSON.parse(raw) as CacheEntry
  } catch {
    return null
  }
}

async function writeCache(command: string, options: CcusageOptions, data: unknown): Promise<void> {
  await ensureCacheDir()
  const entry: CacheEntry = { data, updatedAt: new Date().toISOString() }
  await writeFile(cachePath(command, options), JSON.stringify(entry), "utf-8")
}

// In-memory lock to prevent duplicate concurrent refreshes
const refreshing = new Set<string>()

export function isRefreshing(key: string): boolean {
  return refreshing.has(key)
}

export async function fetchAndCache(command: string, options: CcusageOptions): Promise<void> {
  const key = `${command}:${JSON.stringify(options)}`
  if (refreshing.has(key)) return

  refreshing.add(key)
  try {
    const stdout = await runCcusage(command, options)
    const data = JSON.parse(stdout)
    await writeCache(command, options, data)
  } catch (err) {
    console.error(`[cache] refresh failed for ${command}:`, (err as Error).message)
  } finally {
    refreshing.delete(key)
  }
}
