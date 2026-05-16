import { Router } from "express"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { createHash } from "crypto"

const supabaseUrl = process.env.VITE_SUPABASE_URL || ""
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ""

let supabase: SupabaseClient | null = null
if (supabaseUrl && supabaseServiceKey) {
  supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

const VIEW_MAP: Record<string, string> = {
  all_time: "leaderboard_all_time",
  "30d": "leaderboard_30d",
  "7d": "leaderboard_7d",
  "1d": "leaderboard_1d",
}

export function createLeaderboardRoutes() {
  const router = Router()

  // GET /api/leaderboard
  router.get("/api/leaderboard", async (req, res) => {
    if (!supabase) {
      return res.status(500).json({ error: "Supabase not configured. Set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY." })
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
      const { data, error, count } = await supabase
        .from(viewName)
        .select("*", { count: "exact" })
        .order(sort === "cost" ? "total_cost" : "total_tokens", { ascending: false })
        .range((page - 1) * limit, page * limit - 1)

      if (error) return res.status(500).json({ error: error.message })

      return res.json({
        entries: data || [],
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit),
        total: count || 0,
      })
    } catch (err) {
      return res.status(500).json({ error: (err as Error).message })
    }
  })

  // GET /api/profile/:username
  router.get("/api/profile/:username", async (req, res) => {
    if (!supabase) {
      return res.status(500).json({ error: "Supabase not configured" })
    }

    const { username } = req.params
    const type = req.query.type as string | undefined

    try {
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("username, display_name, avatar_url, bio")
        .eq("username", username)
        .single()

      if (profileError || !profile) {
        return res.status(404).json({ error: "User not found" })
      }

      if (!type) {
        return res.json({ profile })
      }

      const validTypes = ["daily", "monthly", "session", "blocks"]
      if (!validTypes.includes(type)) {
        return res.status(400).json({ error: `Invalid type. Use: ${validTypes.join(", ")}` })
      }

      // Get profile id
      const { data: profileFull } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", username)
        .single()

      if (!profileFull) {
        return res.status(404).json({ error: "User not found" })
      }

      const { data: submission } = await supabase
        .from("data_submissions")
        .select("payload, created_at")
        .eq("user_id", profileFull.id)
        .eq("submission_type", type)
        .order("created_at", { ascending: false })
        .limit(1)
        .single()

      return res.json({
        profile,
        data: submission?.payload || null,
        updatedAt: submission?.created_at || null,
      })
    } catch (err) {
      return res.status(500).json({ error: (err as Error).message })
    }
  })

  // POST /api/submit
  router.post("/api/submit", async (req, res) => {
    if (!supabase) {
      return res.status(500).json({ error: "Supabase not configured" })
    }

    const { type, payload, token } = req.body

    if (!type || !payload || !token) {
      return res.status(400).json({ error: "Missing required fields: type, payload, token" })
    }

    const validTypes = ["daily", "monthly", "session", "blocks"]
    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: `Invalid type. Use: ${validTypes.join(", ")}` })
    }

    // Verify GitHub token
    try {
      const ghRes = await fetch("https://api.github.com/user", {
        headers: {
          Authorization: `token ${token}`,
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "token-leaderboard",
        },
      })
      if (!ghRes.ok) {
        return res.status(401).json({ error: "Invalid GitHub token" })
      }
      const ghUser = await ghRes.json() as { id: number; login: string }

      const { data: profile } = await supabase
        .from("profiles")
        .select("id, username")
        .eq("github_id", ghUser.id)
        .single()

      if (!profile) {
        return res.status(404).json({ error: "No profile found. Sign in via the website first." })
      }

      const dataHash = createHash("md5")
        .update(profile.id + type + createHash("md5").update(JSON.stringify(payload)).digest("hex"))
        .digest("hex")

      // Check duplicate
      const { data: existing } = await supabase
        .from("data_submissions")
        .select("id")
        .eq("data_hash", dataHash)
        .single()

      if (existing) {
        return res.json({ message: "Duplicate detected", duplicate: true })
      }

      const totals = payload.totals as Record<string, unknown> | undefined
      const totalTokens = (totals?.totalTokens as number) || 0
      const totalCost = (totals?.totalCost as number) || 0

      const { error: insertError } = await supabase
        .from("data_submissions")
        .insert({
          user_id: profile.id,
          submission_type: type,
          payload,
          data_hash: dataHash,
          total_tokens: totalTokens,
          total_cost: totalCost,
        })

      if (insertError) {
        return res.status(500).json({ error: insertError.message })
      }

      return res.json({
        message: "Submitted successfully",
        username: profile.username,
        totalTokens,
        totalCost,
      })
    } catch (err) {
      return res.status(500).json({ error: (err as Error).message })
    }
  })

  // Auth routes
  router.get("/api/auth/login", async (req, res) => {
    if (!supabase) {
      return res.status(500).json({ error: "Supabase not configured" })
    }

    const redirectTo = (req.query.redirectTo as string) || "http://localhost:5173/auth/callback"

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "github",
      options: { redirectTo },
    })

    if (error) return res.status(500).json({ error: error.message })
    if (data.url) return res.redirect(data.url)
    return res.status(500).json({ error: "Failed to initiate OAuth" })
  })

  router.get("/api/auth/callback", async (req, res) => {
    if (!supabase) {
      return res.status(500).json({ error: "Supabase not configured" })
    }

    const code = req.query.code as string
    if (!code) return res.redirect("/")

    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) return res.status(500).json({ error: error.message })

    return res.redirect("http://localhost:5173")
  })

  router.post("/api/auth/logout", async (_req, res) => {
    if (!supabase) {
      return res.status(500).json({ error: "Supabase not configured" })
    }
    await supabase.auth.signOut()
    return res.json({ message: "Logged out" })
  })

  router.get("/api/auth/me", async (req, res) => {
    if (!supabase) {
      return res.status(500).json({ error: "Supabase not configured" })
    }

    const authHeader = req.headers.authorization
    if (!authHeader) return res.status(401).json({ error: "Not authenticated" })

    const token = authHeader.replace("Bearer ", "")
    const { data: { user }, error } = await supabase.auth.getUser(token)

    if (error || !user) return res.status(401).json({ error: "Invalid token" })

    const { data: profile } = await supabase
      .from("profiles")
      .select("username, display_name, avatar_url, bio")
      .eq("id", user.id)
      .single()

    return res.json({ user: { id: user.id, email: user.email }, profile })
  })

  return router
}
