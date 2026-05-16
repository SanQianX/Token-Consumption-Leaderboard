import { runCcusage } from "./ccusage.js"
import { loadSettings, type Settings } from "./settings-store.js"

let intervalId: ReturnType<typeof setInterval> | null = null

export async function startSubmitWorker() {
  const settings = await loadSettings()

  if (!settings.autoSubmitEnabled || !settings.apiToken) {
    console.log("[submit-worker] Auto-submit disabled or no API token configured")
    return
  }

  console.log(`[submit-worker] Starting auto-submit every ${settings.submitIntervalMinutes} minutes`)

  // Submit immediately on start
  await submitData(settings)

  // Then on interval
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

async function submitData(settings: Settings) {
  try {
    console.log("[submit-worker] Fetching ccusage data...")
    const stdout = await runCcusage("daily")
    const payload = JSON.parse(stdout)

    console.log("[submit-worker] Submitting to remote server...")
    const res = await fetch(`${settings.serverUrl}/api/submit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Token": settings.apiToken,
      },
      body: JSON.stringify({ type: "daily", payload }),
    })

    const data = await res.json() as { duplicate?: boolean; message?: string; totalTokens?: number; totalCost?: number }
    if (data.duplicate) {
      console.log("[submit-worker] Duplicate data, skipping")
    } else if (data.message) {
      console.log(`[submit-worker] ${data.message} (tokens: ${data.totalTokens}, cost: ${data.totalCost})`)
    }
  } catch (err) {
    console.error("[submit-worker] Submit failed:", (err as Error).message)
  }
}
