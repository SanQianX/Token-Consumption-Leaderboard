import { Router } from "express"
import { query } from "../db/client.js"
import { authMiddleware, adminMiddleware, type AuthRequest } from "../middleware/auth.js"
import { refreshLeaderboardCache } from "../services/leaderboard-cache.js"

const router = Router()

// All admin routes require auth + admin
router.use(authMiddleware)
router.use(adminMiddleware)

// ============================================
// Users CRUD
// ============================================
router.get("/api/admin/users", async (_req, res) => {
  try {
    const page = parseInt(_req.query.page as string) || 1
    const limit = Math.min(parseInt(_req.query.limit as string) || 20, 100)
    const offset = (page - 1) * limit

    const [countResult, rows] = await Promise.all([
      query("SELECT COUNT(*) as total FROM users"),
      query(
        `SELECT id, username, display_name, email, email_verified, auth_provider, is_admin, github_id, created_at, updated_at
         FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
        [limit, offset]
      ),
    ])

    const total = parseInt(countResult.rows[0].total)
    res.json({
      users: rows.rows,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    })
  } catch (err) {
    console.error("Admin list users error:", err)
    res.status(500).json({ error: "Failed to list users" })
  }
})

router.put("/api/admin/users/:id", async (req: AuthRequest, res) => {
  const { id } = req.params
  const { username, email, is_admin, display_name, bio } = req.body as {
    username?: string
    email?: string
    is_admin?: boolean
    display_name?: string
    bio?: string
  }

  try {
    const updates: string[] = []
    const values: unknown[] = []
    let paramIdx = 1

    if (username !== undefined) { updates.push(`username = $${paramIdx++}`); values.push(username) }
    if (email !== undefined) { updates.push(`email = $${paramIdx++}`); values.push(email) }
    if (is_admin !== undefined) { updates.push(`is_admin = $${paramIdx++}`); values.push(is_admin) }
    if (display_name !== undefined) { updates.push(`display_name = $${paramIdx++}`); values.push(display_name) }
    if (bio !== undefined) { updates.push(`bio = $${paramIdx++}`); values.push(bio) }

    if (updates.length === 0) {
      return res.status(400).json({ error: "No fields to update" })
    }

    updates.push(`updated_at = NOW()`)
    values.push(id)

    const result = await query(
      `UPDATE users SET ${updates.join(", ")} WHERE id = $${paramIdx} RETURNING id, username, email, is_admin`,
      values
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" })
    }

    res.json({ user: result.rows[0] })
  } catch (err) {
    console.error("Admin update user error:", err)
    res.status(500).json({ error: "Failed to update user" })
  }
})

router.delete("/api/admin/users/:id", async (req: AuthRequest, res) => {
  const { id } = req.params

  if (id === req.userId) {
    return res.status(400).json({ error: "Cannot delete yourself" })
  }

  try {
    await query("DELETE FROM email_verification_codes WHERE email IN (SELECT email FROM users WHERE id = $1)", [id])
    await query("DELETE FROM api_tokens WHERE user_id = $1", [id])
    await query("DELETE FROM data_submissions WHERE user_id = $1", [id])
    await query("DELETE FROM user_summaries WHERE user_id = $1", [id])
    const result = await query("DELETE FROM users WHERE id = $1 RETURNING id", [id])

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" })
    }

    res.json({ message: "User deleted" })
  } catch (err) {
    console.error("Admin delete user error:", err)
    res.status(500).json({ error: "Failed to delete user" })
  }
})

// ============================================
// Submissions
// ============================================
router.get("/api/admin/submissions", async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100)
    const offset = (page - 1) * limit
    const type = req.query.type as string | undefined

    let whereClause = ""
    const params: unknown[] = []
    if (type) {
      whereClause = "WHERE ds.submission_type = $1"
      params.push(type)
    }

    const countResult = await query(`SELECT COUNT(*) as total FROM data_submissions ds ${whereClause}`, params)

    const paramOffset = params.length + 1
    const rows = await query(
      `SELECT ds.id, ds.submission_type, ds.total_tokens, ds.total_cost, ds.created_at,
              u.username
       FROM data_submissions ds
       JOIN users u ON ds.user_id = u.id
       ${whereClause}
       ORDER BY ds.created_at DESC
       LIMIT $${paramOffset} OFFSET $${paramOffset + 1}`,
      [...params, limit, offset]
    )

    const total = parseInt(countResult.rows[0].total)
    res.json({
      submissions: rows.rows,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    })
  } catch (err) {
    console.error("Admin list submissions error:", err)
    res.status(500).json({ error: "Failed to list submissions" })
  }
})

router.delete("/api/admin/submissions/:id", async (req, res) => {
  const { id } = req.params
  try {
    const result = await query("DELETE FROM data_submissions WHERE id = $1 RETURNING id", [id])
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Submission not found" })
    }
    res.json({ message: "Submission deleted" })
  } catch (err) {
    console.error("Admin delete submission error:", err)
    res.status(500).json({ error: "Failed to delete submission" })
  }
})

// ============================================
// Leaderboard management
// ============================================
router.get("/api/admin/leaderboard", async (_req, res) => {
  try {
    const { rows } = await query("SELECT period, data, updated_at FROM leaderboard_cache ORDER BY period")
    res.json({ caches: rows })
  } catch (err) {
    console.error("Admin leaderboard error:", err)
    res.status(500).json({ error: "Failed to get leaderboard" })
  }
})

router.post("/api/admin/leaderboard/refresh", async (_req, res) => {
  try {
    await refreshLeaderboardCache()
    res.json({ message: "Leaderboard cache refreshed" })
  } catch (err) {
    console.error("Admin refresh leaderboard error:", err)
    res.status(500).json({ error: "Failed to refresh leaderboard" })
  }
})

// ============================================
// Settings (SMTP etc.)
// ============================================
router.get("/api/admin/settings", async (_req, res) => {
  try {
    const { rows } = await query("SELECT key, value, updated_at FROM admin_settings ORDER BY key")
    const settings: Record<string, { value: string; updated_at: string }> = {}
    for (const row of rows) {
      settings[row.key] = { value: row.value, updated_at: row.updated_at }
    }
    res.json({ settings })
  } catch (err) {
    console.error("Admin get settings error:", err)
    res.status(500).json({ error: "Failed to get settings" })
  }
})

router.put("/api/admin/settings", async (req: AuthRequest, res) => {
  const updates = req.body as Record<string, string>

  try {
    for (const [key, value] of Object.entries(updates)) {
      if (typeof value !== "string") continue
      await query(
        `INSERT INTO admin_settings (key, value, updated_at, updated_by) VALUES ($1, $2, NOW(), $3)
         ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW(), updated_by = $3`,
        [key, value, req.userId]
      )
    }
    res.json({ message: "Settings updated" })
  } catch (err) {
    console.error("Admin update settings error:", err)
    res.status(500).json({ error: "Failed to update settings" })
  }
})

export function createAdminRoutes(): Router {
  return router
}
