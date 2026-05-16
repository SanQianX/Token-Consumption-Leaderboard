import { Router } from "express"
import { loadSettings, saveSettings } from "./settings-store.js"
import { stopSubmitWorker, startSubmitWorker } from "./submit-worker.js"

const router = Router()

// GET /api/settings
router.get("/api/settings", async (_req, res) => {
  try {
    const settings = await loadSettings()
    // Don't expose full API token
    res.json({
      ...settings,
      apiToken: settings.apiToken
        ? `${settings.apiToken.slice(0, 10)}${"*".repeat(20)}`
        : "",
      _hasApiToken: !!settings.apiToken,
    })
  } catch (err) {
    res.status(500).json({ error: (err as Error).message })
  }
})

// PUT /api/settings
router.put("/api/settings", async (req, res) => {
  try {
    const current = await loadSettings()
    const body = req.body as Partial<{
      serverUrl: string
      apiToken: string
      submitIntervalMinutes: number
      autoSubmitEnabled: boolean
    }>

    const newSettings = {
      serverUrl: body.serverUrl ?? current.serverUrl,
      apiToken: body.apiToken ?? current.apiToken,
      submitIntervalMinutes: body.submitIntervalMinutes ?? current.submitIntervalMinutes,
      autoSubmitEnabled: body.autoSubmitEnabled ?? current.autoSubmitEnabled,
    }

    await saveSettings(newSettings)

    // Restart worker with new settings
    stopSubmitWorker()
    if (newSettings.autoSubmitEnabled && newSettings.apiToken) {
      startSubmitWorker()
    }

    res.json({ message: "Settings saved" })
  } catch (err) {
    res.status(500).json({ error: (err as Error).message })
  }
})

// POST /api/settings/test-submit
router.post("/api/settings/test-submit", async (_req, res) => {
  try {
    const settings = await loadSettings()
    if (!settings.apiToken) {
      return res.status(400).json({ error: "No API token configured" })
    }

    // Trigger a single submit
    const { runCcusage } = await import("./ccusage.js")
    const stdout = await runCcusage("daily")
    const payload = JSON.parse(stdout)

    const submitRes = await fetch(`${settings.serverUrl}/api/submit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Token": settings.apiToken,
      },
      body: JSON.stringify({ type: "daily", payload }),
    })

    const data = await submitRes.json()
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: (err as Error).message })
  }
})

export function createSettingsRoutes() {
  return router
}
