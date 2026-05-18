import { runCcusage } from "./ccusage.js"
import { loadSettings, saveSettings, type Settings } from "./settings-store.js"
import { transformForCommand } from "./transform.js"

let intervalId: ReturnType<typeof setInterval> | null = null

async function updateSubmitStatus(status: string) {
  const settings = await loadSettings()
  settings.lastSubmitAt = new Date().toISOString()
  settings.lastSubmitStatus = status
  await saveSettings(settings)
}

export async function startSubmitWorker() {
  const settings = await loadSettings()

  if (!settings.autoSubmitEnabled || !settings.apiToken) {
    console.log("[submit-worker] Auto-submit disabled or no API token configured")
    return
  }

  console.log(`[submit-worker] Starting auto-submit every ${settings.submitIntervalMinutes} minutes`)

  await submitData(settings)

  intervalId = setInterval(async () => {
    const currentSettings = await loadSettings()
    if (!currentSettings.autoSubmitEnabled || !currentSettings.apiToken) {
      stopSubmitWorker()
      return
    }
    await submitData(currentSettings)
  }, settings.submitIntervalMinutes * 60 * 1000)
}

export function stopSubmitWorker() {
  if (intervalId) {
    clearInterval(intervalId)
    intervalId = null
    console.log("[submit-worker] Stopped")
  }
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

interface MonthlyAgg {
  inputTokens: number
  outputTokens: number
  cacheCreationTokens: number
  cacheReadTokens: number
  totalTokens: number
  totalCost: number
  modelsUsed: Set<string>
}

function deriveMonthlyFromDaily(rawDaily: { daily: DailyEntry[] }) {
  const monthMap = new Map<string, MonthlyAgg>()

  for (const entry of rawDaily.daily) {
    const dateStr = entry.date ?? entry.period ?? ""
    const month = dateStr.slice(0, 7)

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
  const monthly = months.map(([period, agg]) => ({
    period,
    inputTokens: agg.inputTokens,
    outputTokens: agg.outputTokens,
    cacheCreationTokens: agg.cacheCreationTokens,
    cacheReadTokens: agg.cacheReadTokens,
    totalTokens: agg.totalTokens,
    totalCost: agg.totalCost,
    modelsUsed: Array.from(agg.modelsUsed),
  }))

  return {
    monthly,
    totals: {
      inputTokens: monthly.reduce((s, e) => s + e.inputTokens, 0),
      outputTokens: monthly.reduce((s, e) => s + e.outputTokens, 0),
      cacheCreationTokens: monthly.reduce((s, e) => s + e.cacheCreationTokens, 0),
      cacheReadTokens: monthly.reduce((s, e) => s + e.cacheReadTokens, 0),
      totalTokens: monthly.reduce((s, e) => s + e.totalTokens, 0),
      totalCost: monthly.reduce((s, e) => s + e.totalCost, 0),
    },
  }
}

async function submitSingle(settings: Settings, type: "daily" | "monthly", payload: unknown) {
  const transformedPayload = transformForCommand(type, payload)

  const res = await fetch(`${settings.serverUrl}/api/submit`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Token": settings.apiToken,
    },
    body: JSON.stringify({ type, payload: transformedPayload }),
  })

  return res.json() as Promise<{ duplicate?: boolean; message?: string; totalTokens?: number; totalCost?: number }>
}

async function submitData(settings: Settings) {
  try {
    console.log("[submit-worker] Fetching ccusage daily data...")

    // Single ccusage call — derive monthly from daily
    const stdout = await runCcusage("daily")
    const rawDaily = JSON.parse(stdout)

    // Submit daily
    const dailyResult = await submitSingle(settings, "daily", rawDaily)
    if (dailyResult.duplicate) {
      console.log("[submit-worker] Daily: duplicate data, skipping")
    } else if (dailyResult.message) {
      console.log(`[submit-worker] Daily: ${dailyResult.message} (tokens: ${dailyResult.totalTokens}, cost: ${dailyResult.totalCost})`)
    }

    // Derive and submit monthly from the same daily data
    try {
      const rawMonthly = deriveMonthlyFromDaily(rawDaily)
      const monthlyResult = await submitSingle(settings, "monthly", rawMonthly)
      if (monthlyResult.duplicate) {
        console.log("[submit-worker] Monthly: duplicate data, skipping")
      } else if (monthlyResult.message) {
        console.log(`[submit-worker] Monthly: ${monthlyResult.message} (tokens: ${monthlyResult.totalTokens}, cost: ${monthlyResult.totalCost})`)
      }
    } catch {
      console.log("[submit-worker] Monthly submit failed, skipping")
    }

    await updateSubmitStatus("success")
  } catch (err) {
    console.error("[submit-worker] Submit failed:", (err as Error).message)
    await updateSubmitStatus(`failed: ${(err as Error).message}`)
  }
}
