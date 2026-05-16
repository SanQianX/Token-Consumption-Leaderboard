import { Router } from "express"
import { getLeaderboardFromCache } from "../services/leaderboard-cache.js"

const router = Router()

// GET /api/leaderboard
router.get("/api/leaderboard", async (req, res) => {
  const period = (req.query.period as string) || "all_time"
  const sort = (req.query.sort as string) || "tokens"
  const page = Math.max(1, parseInt(req.query.page as string) || 1)
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50))

  const validPeriods = ["all_time", "30d", "7d", "1d"]
  if (!validPeriods.includes(period)) {
    return res.status(400).json({ error: "Invalid period. Use: all_time, 30d, 7d, 1d" })
  }

  try {
    const { data, updatedAt, stale } = await getLeaderboardFromCache(period)

    // Sort
    const sorted = [...(data as Array<Record<string, unknown>>)].sort((a, b) => {
      if (sort === "cost") {
        return ((b.total_cost as number) || 0) - ((a.total_cost as number) || 0)
      }
      return ((b.total_tokens as number) || 0) - ((a.total_tokens as number) || 0)
    })

    // Paginate
    const total = sorted.length
    const start = (page - 1) * limit
    const entries = sorted.slice(start, start + limit)

    res.json({
      entries,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      total,
      updatedAt,
      stale,
    })
  } catch (err) {
    console.error("Leaderboard error:", err)
    res.status(500).json({ error: "Failed to fetch leaderboard" })
  }
})

export function createLeaderboardRoutes(): Router {
  return router
}
