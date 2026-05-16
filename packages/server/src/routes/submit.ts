import { Router } from "express"
import { createHash } from "crypto"
import { query } from "../db/client.js"

const router = Router()

// POST /api/submit — Submit token data
router.post("/api/submit", async (req, res) => {
  const { type, payload } = req.body as {
    type?: string
    payload?: Record<string, unknown>
  }

  if (!type || !payload) {
    return res.status(400).json({ error: "Missing required fields: type, payload" })
  }

  const validTypes = ["daily", "monthly", "session", "blocks"]
  if (!validTypes.includes(type)) {
    return res.status(400).json({ error: `Invalid type. Use: ${validTypes.join(", ")}` })
  }

  // Authenticate via JWT or API token
  let userId: string | undefined
  const authHeader = req.headers.authorization
  const apiToken = req.headers["x-api-token"] as string | undefined

  if (authHeader?.startsWith("Bearer ")) {
    // JWT auth
    const { verifyToken } = await import("../utils/token.js")
    const payload = verifyToken(authHeader.slice(7))
    if (payload) {
      userId = payload.userId
    }
  } else if (apiToken) {
    // API token auth
    const tokenHash = createHash("sha256").update(apiToken).digest("hex")
    const tokenPrefix = apiToken.slice(0, 10)

    const { rows } = await query(
      "SELECT user_id FROM api_tokens WHERE token_hash = $1 AND token_prefix = $2",
      [tokenHash, tokenPrefix]
    )

    if (rows.length > 0) {
      userId = rows[0].user_id
      // Update last_used_at
      await query("UPDATE api_tokens SET last_used_at = NOW() WHERE token_hash = $1", [tokenHash])
    }
  }

  if (!userId) {
    return res.status(401).json({ error: "Not authenticated. Provide Bearer JWT or X-API-Token header." })
  }

  try {
    // Deduplication hash
    const payloadHash = createHash("md5").update(JSON.stringify(payload)).digest("hex")
    const dataHash = createHash("md5").update(`${userId}:${type}:${payloadHash}`).digest("hex")

    // Check duplicate
    const existing = await query("SELECT id FROM data_submissions WHERE data_hash = $1", [dataHash])
    if (existing.rows.length > 0) {
      return res.json({ message: "Duplicate detected", duplicate: true })
    }

    // Extract totals
    const totals = payload.totals as Record<string, unknown> | undefined
    const totalTokens = (totals?.totalTokens as number) || 0
    const totalCost = (totals?.totalCost as number) || 0

    // Insert
    await query(
      `INSERT INTO data_submissions (user_id, submission_type, payload, data_hash, total_tokens, total_cost)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, type, JSON.stringify(payload), dataHash, totalTokens, totalCost]
    )

    // Get username for response
    const userRows = await query("SELECT username FROM users WHERE id = $1", [userId])

    res.json({
      message: "Submitted successfully",
      username: userRows.rows[0]?.username,
      totalTokens,
      totalCost,
    })
  } catch (err) {
    console.error("Submit error:", err)
    res.status(500).json({ error: "Submission failed" })
  }
})

export function createSubmitRoutes(): Router {
  return router
}
