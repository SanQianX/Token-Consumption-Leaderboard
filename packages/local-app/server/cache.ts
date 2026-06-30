import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"
import { getLocalTimezone, runCcusage, type CcusageOptions } from "./ccusage.js"

interface CacheEntry {
  data: unknown
  updatedAt: string
  timezone?: string
}

const __dirname = dirname(fileURLToPath(import.meta.url))
const CACHE_DIR = join(__dirname, "..", ".cache")
const DAILY_CACHE_FILE = join(CACHE_DIR, "daily.json")

export function readDailyCache(timezone = getLocalTimezone()): CacheEntry | null {
  try {
    const raw = readFileSync(DAILY_CACHE_FILE, "utf-8")
    const entry = JSON.parse(raw) as CacheEntry
    if (entry.timezone !== timezone) return null
    return entry
  } catch {
    return null
  }
}

let refreshPromise: Promise<void> | null = null

export function isRefreshingCache(): boolean {
  return refreshPromise !== null
}

export function fetchAndCacheDaily(): Promise<void> {
  if (refreshPromise) return refreshPromise

  if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true })

  const timezone = getLocalTimezone()

  refreshPromise = runCcusage("daily", { offline: true, timezone })
    .then((stdout) => {
      const data = JSON.parse(stdout)
      const entry = { data, updatedAt: new Date().toISOString(), timezone }
      writeFileSync(DAILY_CACHE_FILE, JSON.stringify(entry), "utf-8")
      console.log("[cache] refreshed, days:", (data as { daily?: unknown[] }).daily?.length)
    })
    .catch((err) => {
      console.error("[cache] refresh failed:", err.message)
    })
    .finally(() => {
      refreshPromise = null
    })

  return refreshPromise
}

interface DailyEntry {
  period?: string
  date?: string
  inputTokens: number
  outputTokens: number
  cacheCreationTokens: number
  cacheReadTokens: number
  totalTokens: number
  totalCost: number
  modelsUsed: string[]
  [key: string]: unknown
}

interface MonthlyEntry {
  month: string
  inputTokens: number
  outputTokens: number
  cacheCreationTokens: number
  cacheReadTokens: number
  totalTokens: number
  totalCost: number
  modelsUsed: string[]
  [key: string]: unknown
}

interface RawDailyData {
  daily: DailyEntry[]
  totals: {
    inputTokens: number
    outputTokens: number
    cacheCreationTokens: number
    cacheReadTokens: number
    totalTokens: number
    totalCost: number
  }
}

function groupByMonth(entries: DailyEntry[]): MonthlyEntry[] {
  const monthMap = new Map<string, {
    inputTokens: number
    outputTokens: number
    cacheCreationTokens: number
    cacheReadTokens: number
    totalTokens: number
    totalCost: number
    modelsUsed: Set<string>
  }>()

  for (const entry of entries) {
    const dateStr = entry.date ?? entry.period ?? ""
    const month = dateStr.slice(0, 7) // "2026-05"

    if (!monthMap.has(month)) {
      monthMap.set(month, {
        inputTokens: 0,
        outputTokens: 0,
        cacheCreationTokens: 0,
        cacheReadTokens: 0,
        totalTokens: 0,
        totalCost: 0,
        modelsUsed: new Set(),
      })
    }

    const agg = monthMap.get(month)!
    agg.inputTokens += entry.inputTokens
    agg.outputTokens += entry.outputTokens
    agg.cacheCreationTokens += entry.cacheCreationTokens
    agg.cacheReadTokens += entry.cacheReadTokens
    agg.totalTokens += entry.totalTokens
    agg.totalCost += entry.totalCost
    for (const m of (entry.modelsUsed ?? [])) {
      agg.modelsUsed.add(m)
    }
  }

  const months = Array.from(monthMap.entries()).sort(([a], [b]) => a.localeCompare(b))
  return months.map(([month, agg]) => ({
    month,
    inputTokens: agg.inputTokens,
    outputTokens: agg.outputTokens,
    cacheCreationTokens: agg.cacheCreationTokens,
    cacheReadTokens: agg.cacheReadTokens,
    totalTokens: agg.totalTokens,
    totalCost: agg.totalCost,
    modelsUsed: Array.from(agg.modelsUsed),
  }))
}

function computeTotals(entries: { inputTokens: number; outputTokens: number; cacheCreationTokens: number; cacheReadTokens: number; totalTokens: number; totalCost: number }[]) {
  return {
    inputTokens: entries.reduce((s, e) => s + e.inputTokens, 0),
    outputTokens: entries.reduce((s, e) => s + e.outputTokens, 0),
    cacheCreationTokens: entries.reduce((s, e) => s + e.cacheCreationTokens, 0),
    cacheReadTokens: entries.reduce((s, e) => s + e.cacheReadTokens, 0),
    totalTokens: entries.reduce((s, e) => s + e.totalTokens, 0),
    totalCost: entries.reduce((s, e) => s + e.totalCost, 0),
  }
}

// Derive different views from the single daily cache
export function deriveView(command: string, options: CcusageOptions, rawData: RawDailyData) {
  let daily = rawData.daily

  // Apply date filters for custom range
  if (options.since || options.until) {
    daily = daily.filter((entry) => {
      const dateStr = entry.date ?? entry.period ?? ""
      if (options.since && dateStr < options.since) return false
      if (options.until && dateStr > options.until) return false
      return true
    })
  }

  if (command === "daily" || command === "custom" || command === "alltime") {
    const transformed = daily.map((entry) => ({
      ...entry,
      date: entry.date ?? entry.period,
    }))
    return {
      daily: transformed,
      totals: computeTotals(transformed),
    }
  }

  if (command === "monthly") {
    const monthlyEntries = groupByMonth(daily)
    return {
      monthly: monthlyEntries,
      totals: computeTotals(monthlyEntries),
    }
  }

  return rawData
}

// Legacy compatibility for routes that still use old signatures
export { DAILY_CACHE_FILE }

// Periodic reconciliation: keep daily cache (and therefore /api/daily) aligned
// with ccusage's source-of-truth, in case live deltas drift (model pricing
// changes, missed cache sub-categories, etc.). Fire-and-forget; .unref() so it
// never blocks process exit.
if (typeof setInterval !== "undefined") {
  const reconcile = setInterval(() => {
    fetchAndCacheDaily().catch(() => {})
  }, 5 * 60 * 1000)
  reconcile.unref()
}
