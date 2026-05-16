import type { VercelRequest, VercelResponse } from "@vercel/node"
import { supabase } from "../_lib/supabase"

const VIEW_MAP: Record<string, string> = {
  all_time: "leaderboard_all_time",
  "30d": "leaderboard_30d",
  "7d": "leaderboard_7d",
  "1d": "leaderboard_1d",
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  if (!supabase) {
    return res.status(500).json({ error: "Server not configured" })
  }

  const period = (req.query.period as string) || "all_time"
  const sort = (req.query.sort as string) || "tokens"
  const page = Math.max(1, parseInt(req.query.page as string) || 1)
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50))

  const viewName = VIEW_MAP[period]
  if (!viewName) {
    return res.status(400).json({ error: "Invalid period. Use: all_time, 30d, 7d, 1d" })
  }

  try {
    // Query the leaderboard view
    const { data, error, count } = await supabase
      .from(viewName)
      .select("*", { count: "exact" })
      .order(sort === "cost" ? "total_cost" : "total_tokens", { ascending: false })
      .range((page - 1) * limit, page * limit - 1)

    if (error) {
      return res.status(500).json({ error: error.message })
    }

    return res.status(200).json({
      entries: data || [],
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
      total: count || 0,
    })
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message })
  }
}
