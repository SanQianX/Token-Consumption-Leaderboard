import { Router, type Request, type Response } from "express"
import { type CcusageOptions } from "./ccusage.js"
import { readDailyCache, fetchAndCacheDaily, isRefreshingCache, deriveView } from "./cache.js"
import { startLiveWatcher, getSnapshot, subscribe } from "./live.js"

let liveStarted = false
function ensureLiveStarted(): void {
  if (liveStarted) return
  liveStarted = true
  startLiveWatcher()
}

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

    try {
      let cached = readDailyCache()

      if (!cached) {
        // No cache yet — await the first fetch before responding
        await fetchAndCacheDaily()
        cached = readDailyCache()
      }

      if (cached) {
        const derivedData = deriveView(command, options, cached.data as Parameters<typeof deriveView>[2])
        res.json({
          data: derivedData,
          updatedAt: cached.updatedAt,
          stale: true,
          refreshing: isRefreshingCache(),
        })

        // Trigger background refresh for next request
        fetchAndCacheDaily()
      } else {
        res.json({ data: null, loading: true, stale: false })
      }
    } catch (error) {
      res.status(500).json({ error: (error as Error).message })
    }
  }
}

// All views derived from single daily ccusage call
router.get("/api/daily", makeHandler("daily"))
router.get("/api/monthly", makeHandler("monthly"))
router.get("/api/session", makeHandler("daily"))
router.get("/api/blocks", makeHandler("daily"))

router.get("/api/live/stream", (req: Request, res: Response) => {
  ensureLiveStarted()

  res.setHeader("Content-Type", "text/event-stream")
  res.setHeader("Cache-Control", "no-cache, no-transform")
  res.setHeader("Connection", "keep-alive")
  res.setHeader("X-Accel-Buffering", "no")

  const send = (data: unknown): void => {
    res.write(`data: ${JSON.stringify(data)}\n\n`)
  }

  send({ type: "snapshot", ...getSnapshot() })

  const unsubscribe = subscribe((snap) => send({ type: "delta", ...snap }))
  const heartbeat = setInterval(() => {
    res.write(`: ping\n\n`)
  }, 15_000)

  req.on("close", () => {
    clearInterval(heartbeat)
    unsubscribe()
  })
})

export { router }