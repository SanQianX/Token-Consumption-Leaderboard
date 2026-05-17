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

async function submitSingle(settings: Settings, type: "daily" | "monthly") {
  const stdout = await runCcusage(type)
  const raw = JSON.parse(stdout)
  const payload = transformForCommand(type, raw)

  const res = await fetch(`${settings.serverUrl}/api/submit`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Token": settings.apiToken,
    },
    body: JSON.stringify({ type, payload }),
  })

  return res.json() as Promise<{ duplicate?: boolean; message?: string; totalTokens?: number; totalCost?: number }>
}

async function submitData(settings: Settings) {
  try {
    console.log("[submit-worker] Fetching ccusage data...")

    const dailyResult = await submitSingle(settings, "daily")
    if (dailyResult.duplicate) {
      console.log("[submit-worker] Daily: duplicate data, skipping")
    } else if (dailyResult.message) {
      console.log(`[submit-worker] Daily: ${dailyResult.message} (tokens: ${dailyResult.totalTokens}, cost: ${dailyResult.totalCost})`)
    }

    try {
      const monthlyResult = await submitSingle(settings, "monthly")
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
