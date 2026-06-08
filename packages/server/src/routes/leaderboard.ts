import { Router } from "express"
import { getLeaderboardFromCache } from "../services/leaderboard-cache.js"
import { optionalAuth, type AuthRequest } from "../middleware/auth.js"

const router = Router()

// GET /api/leaderboard
router.get("/api/leaderboard", optionalAuth, async (req: AuthRequest, res) => {
  const period = (req.query.period as string) || "all_time"
  const sort = (req.query.sort as string) || "tokens"

  const validPeriods = ["all_time", "30d", "7d", "1d"]
  if (!validPeriods.includes(period)) {
    return res.status(400).json({ error: "Invalid period. Use: all_time, 30d, 7d, 1d" })
  }

  try {
    const { data, updatedAt, stale } = await getLeaderboardFromCache(period)

    type RankEntry = { rank: number; username: string; total_tokens: number; total_cost: number }
    const sorted = [...(data as RankEntry[])].sort((a, b) => {
      if (sort === "cost") {
        return (b.total_cost || 0) - (a.total_cost || 0)
      }
      return (b.total_tokens || 0) - (a.total_tokens || 0)
    })

    // Re-rank after re-sorting
    sorted.forEach((entry, i) => { entry.rank = i + 1 })

    const total = sorted.length
    const entries = sorted.slice(0, 100)

    // Find the current user's rank (from full sorted list, not just top 100)
    const targetUsername = req.username || (req.query.username as string | undefined)
    const myRankEntry = targetUsername
      ? sorted.find(e => e.username === targetUsername) || null
      : null

    res.json({
      entries,
      total,
      updatedAt,
      stale,
      myRank: myRankEntry,
    })
  } catch (err) {
    console.error("Leaderboard error:", err)
    res.status(500).json({ error: "Failed to fetch leaderboard" })
  }
})

export function createLeaderboardRoutes(): Router {
  return router
}
