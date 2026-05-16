import { Router } from "express"
import { type CcusageOptions } from "./ccusage.js"
import { readCache, fetchAndCache, isRefreshing } from "./cache.js"
import { createSettingsRoutes } from "./settings-routes.js"

const router = Router()

function parseOptions(query: Record<string, string | undefined>): CcusageOptions {
  const options: CcusageOptions = {}
  if (query.since) options.since = query.since
  if (query.until) options.until = query.until
  if (query.offline === "true") options.offline = true
  if (query.project) options.project = query.project
  return options
}

function makeHandler(command: string) {
  return async (req: { query: Record<string, string | undefined> }, res: {
    json: (body: unknown) => void
    status: (code: number) => { json: (body: unknown) => void }
  }) => {
    const options = parseOptions(req.query)
    const cacheKey = `${command}:${JSON.stringify(options)}`

    try {
      // Return cached data immediately
      const cached = await readCache(command, options)

      if (cached) {
        // Send stale data, refresh in background
        res.json({
          ...cached,
          stale: true,
          refreshing: isRefreshing(cacheKey),
        })

        // Trigger background refresh (non-blocking)
        fetchAndCache(command, options)
      } else {
        // No cache yet — must wait for first fetch
        res.json({ data: null, loading: true, stale: false })

        // Fetch in background, next request will have data
        fetchAndCache(command, options)
      }
    } catch (error) {
      res.status(500).json({ error: (error as Error).message })
    }
  }
}

// Local ccusage data routes
router.get("/api/daily", makeHandler("daily"))
router.get("/api/monthly", makeHandler("monthly"))
router.get("/api/session", makeHandler("session"))
router.get("/api/blocks", makeHandler("blocks"))

// Settings routes
router.use(createSettingsRoutes())

export { router }
