import { query } from "../db/client.js"

const VIEW_MAP: Record<string, string> = {
  all_time: "leaderboard_all_time",
  "30d": "leaderboard_30d",
  "7d": "leaderboard_7d",
  "1d": "leaderboard_1d",
}

export async function refreshLeaderboardCache(): Promise<void> {
  for (const [period, viewName] of Object.entries(VIEW_MAP)) {
    try {
      const { rows } = await query(`SELECT * FROM ${viewName}`)
      await query(
        `INSERT INTO leaderboard_cache (period, data, updated_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (period) DO UPDATE SET data = $2, updated_at = NOW()`,
        [period, JSON.stringify(rows)]
      )
      console.log(`Refreshed leaderboard cache: ${period} (${rows.length} entries)`)
    } catch (err) {
      console.error(`Failed to refresh cache for ${period}:`, err)
    }
  }
}

export async function getLeaderboardFromCache(period: string): Promise<{
  data: unknown[]
  updatedAt: string | null
  stale: boolean
}> {
  const { rows } = await query(
    "SELECT data, updated_at FROM leaderboard_cache WHERE period = $1",
    [period]
  )

  if (rows.length === 0) {
    return { data: [], updatedAt: null, stale: false }
  }

  const cache = rows[0]
  const updatedAt = new Date(cache.updated_at)
  const stale = Date.now() - updatedAt.getTime() > 60 * 60 * 1000 // 1 hour

  if (stale) {
    // Refresh in background
    refreshLeaderboardCache().catch(console.error)
  }

  return {
    data: cache.data,
    updatedAt: cache.updated_at,
    stale,
  }
}
