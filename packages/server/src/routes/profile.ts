import { Router } from "express"
import { query } from "../db/client.js"

const router = Router()

// GET /api/profile/:username
router.get("/api/profile/:username", async (req, res) => {
  const { username } = req.params

  try {
    const { rows } = await query(
      "SELECT username, display_name, avatar_url, bio FROM users WHERE username = $1",
      [username]
    )

    if (rows.length === 0) {
      return res.status(404).json({ error: "User not found" })
    }

    const profile = rows[0]

    // Get summary
    const summaryRows = await query(
      `SELECT total_tokens_all, cost_all, total_tokens_30d, cost_30d,
              total_tokens_7d, cost_7d, total_tokens_1d, cost_1d,
              last_submitted_at
       FROM user_summaries WHERE user_id = (SELECT id FROM users WHERE username = $1)`,
      [username]
    )

    const summary = summaryRows.rows[0] || null

    res.json({ profile, summary })
  } catch (err) {
    console.error("Profile error:", err)
    res.status(500).json({ error: "Failed to fetch profile" })
  }
})

// GET /api/profile/:username/data
router.get("/api/profile/:username/data", async (req, res) => {
  const { username } = req.params
  const type = req.query.type as string

  if (!type) {
    return res.status(400).json({ error: "Missing query param: type" })
  }

  const validTypes = ["daily", "monthly", "session", "blocks"]
  if (!validTypes.includes(type)) {
    return res.status(400).json({ error: `Invalid type. Use: ${validTypes.join(", ")}` })
  }

  try {
    const { rows } = await query(
      `SELECT ds.payload, ds.created_at
       FROM data_submissions ds
       JOIN users u ON u.id = ds.user_id
       WHERE u.username = $1 AND ds.submission_type = $2
       ORDER BY ds.created_at DESC
       LIMIT 1`,
      [username, type]
    )

    if (rows.length === 0) {
      return res.json({ data: null, updatedAt: null })
    }

    res.json({
      data: rows[0].payload,
      updatedAt: rows[0].created_at,
    })
  } catch (err) {
    console.error("Profile data error:", err)
    res.status(500).json({ error: "Failed to fetch profile data" })
  }
})

export function createProfileRoutes(): Router {
  return router
}
