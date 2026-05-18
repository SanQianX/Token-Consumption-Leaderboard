import { readFile, writeFile, mkdir } from "node:fs/promises"
import { join } from "node:path"
import { existsSync } from "node:fs"
import { runCcusage, type CcusageOptions } from "./ccusage.js"

interface CacheEntry {
  data: unknown
  updatedAt: string
}

const CACHE_DIR = join(import.meta.dirname, "..", ".cache")
const DAILY_CACHE_FILE = join(CACHE_DIR, "daily.json")

async function ensureCacheDir() {
  if (!existsSync(CACHE_DIR)) {
    await mkdir(CACHE_DIR, { recursive: true })
  }
}

export async function readDailyCache(): Promise<CacheEntry | null> {
  try {
    const raw = await readFile(DAILY_CACHE_FILE, "utf-8")
    return JSON.parse(raw) as CacheEntry
  } catch {
    return null
  }
}

async function writeDailyCache(data: unknown): Promise<void> {
  await ensureCacheDir()
  const entry: CacheEntry = { data, updatedAt: new Date().toISOString() }
  await writeFile(DAILY_CACHE_FILE, JSON.stringify(entry), "utf-8")
}

// In-memory lock to prevent duplicate concurrent refreshes
let refreshing = false

export function isRefreshingCache(): boolean {
  return refreshing
}

export async function fetchAndCacheDaily(): Promise<void> {
  if (refreshing) return

  refreshing = true
  try {
    const stdout = await runCcusage("daily")
    const data = JSON.parse(stdout)
    await writeDailyCache(data)
  } catch (err) {
    console.error(`[cache] refresh failed:`, (err as Error).message)
  } finally {
    refreshing = false
  }
}

// Backward-compatible: for submit-worker that needs monthly data
export async function fetchMonthlyRaw(): Promise<string> {
  return runCcusage("monthly")
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
