import { Router } from "express"
import bcrypt from "bcryptjs"
import { v4 as uuidv4 } from "uuid"
import { createHash } from "crypto"
import { query } from "../db/client.js"
import { signToken } from "../utils/token.js"
import { sendVerificationCode } from "../services/email.js"
import { authMiddleware, type AuthRequest } from "../middleware/auth.js"

const router = Router()

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID || ""
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET || ""
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173"

// ============================================
// GET /api/auth/github — Redirect to GitHub OAuth
// ============================================
router.get("/api/auth/github", (req, res) => {
  const returnTo = req.query.return_to as string | undefined
  const state = Buffer.from(JSON.stringify({ returnTo: returnTo || FRONTEND_URL })).toString("base64url")
  const redirectUri = `${FRONTEND_URL}/api/auth/github/callback`
  const githubAuthUrl = new URL("https://github.com/login/oauth/authorize")
  githubAuthUrl.searchParams.set("client_id", GITHUB_CLIENT_ID)
  githubAuthUrl.searchParams.set("redirect_uri", redirectUri)
  githubAuthUrl.searchParams.set("scope", "read:user,user:email")
  githubAuthUrl.searchParams.set("state", state)
  res.redirect(githubAuthUrl.toString())
})

// ============================================
// GET /api/auth/github/callback — OAuth callback
// ============================================
router.get("/api/auth/github/callback", async (req, res) => {
  // Decode state to recover the caller's origin
  const stateStr = req.query.state as string
  let returnTo: string | null = null
  try {
    const state = JSON.parse(Buffer.from(stateStr, "base64url").toString())
    const rt = state.returnTo || ""
    console.log(`[oauth] callback returnTo="${rt}", FRONTEND_URL="${FRONTEND_URL}"`)
    if (rt === FRONTEND_URL || /^http:\/\/localhost(:\d+)?$/.test(rt)) {
      returnTo = rt
    } else {
      console.log(`[oauth] returnTo "${rt}" rejected, falling back to FRONTEND_URL`)
    }
  } catch (err) {
    console.log(`[oauth] state decode failed:`, (err as Error).message)
  }

  const code = req.query.code as string
  if (!code) {
    const fallback = returnTo || FRONTEND_URL
    console.log(`[oauth] no code in callback, redirecting to ${fallback}/login?error=no_code`)
    return res.redirect(`${fallback}/login?error=no_code`)
  }

  try {
    // Exchange code for access token
    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        client_id: GITHUB_CLIENT_ID,
        client_secret: GITHUB_CLIENT_SECRET,
        code,
      }),
    })
    const tokenData = await tokenRes.json() as { access_token?: string; error?: string }
    if (!tokenData.access_token) {
      const fallback = returnTo || FRONTEND_URL
      return res.redirect(`${fallback}/login?error=token_exchange_failed`)
    }

    // Get GitHub user info
    const ghUserRes = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `token ${tokenData.access_token}`,
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "token-leaderboard",
      },
    })
    const ghUser = await ghUserRes.json() as {
      id: number
      login: string
      name: string | null
      avatar_url: string
      email: string | null
    }

    // Get email if not public
    let email = ghUser.email
    if (!email) {
      const emailRes = await fetch("https://api.github.com/user/emails", {
        headers: {
          Authorization: `token ${tokenData.access_token}`,
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "token-leaderboard",
        },
      })
      const emails = await emailRes.json() as Array<{ email: string; primary: boolean }>
      const primary = emails.find((e) => e.primary)
      if (primary) email = primary.email
    }

    // Upsert user
    const { rows } = await query(
      `SELECT id, username FROM users WHERE github_id = $1`,
      [ghUser.id]
    )

    let userId: string
    let username: string

    if (rows.length > 0) {
      userId = rows[0].id
      username = rows[0].username
      await query(
        `UPDATE users SET display_name = COALESCE(display_name, $1), avatar_url = $2,
         email = COALESCE(email, $3), auth_provider = CASE WHEN auth_provider = 'email' THEN 'both' ELSE auth_provider END,
         updated_at = NOW()
         WHERE id = $4`,
        [ghUser.name, ghUser.avatar_url, email, userId]
      )
    } else {
      username = ghUser.login
      // Ensure username uniqueness
      const existingUsername = await query("SELECT id FROM users WHERE username = $1", [username])
      if (existingUsername.rows.length > 0) {
        username = `${username}_${ghUser.id}`
      }

      const insertResult = await query(
        `INSERT INTO users (username, display_name, avatar_url, email, github_id, auth_provider, email_verified)
         VALUES ($1, $2, $3, $4, $5, 'github', TRUE)
         RETURNING id, username`,
        [username, ghUser.name, ghUser.avatar_url, email, ghUser.id]
      )
      userId = insertResult.rows[0].id
      username = insertResult.rows[0].username
    }

    const jwt = signToken({ userId, username })

    // Always redirect to our own frontend first, pass returnTo as a query param.
    // The frontend AuthCallbackPage will then forward to localhost if needed.
    // This avoids HTTPS→HTTP downgrade redirect issues.
    const isLocalhost = returnTo && /^http:\/\/localhost(:\d+)?$/.test(returnTo)
    if (isLocalhost) {
      console.log(`[oauth] success, redirecting via own callback to localhost`)
      res.redirect(`${FRONTEND_URL}/auth/callback?token=${jwt}&return_to=${encodeURIComponent(returnTo!)}`)
    } else {
      const dest = returnTo || FRONTEND_URL
      console.log(`[oauth] success, redirecting to ${dest}/auth/callback?token=...`)
      res.redirect(`${dest}/auth/callback?token=${jwt}`)
    }
  } catch (err) {
    console.error("GitHub OAuth error:", err)
    const fallback = returnTo || FRONTEND_URL
    res.redirect(`${fallback}/login?error=oauth_failed`)
  }
})

// ============================================
// POST /api/auth/register — Email registration
// ============================================
router.post("/api/auth/register", async (req, res) => {
  const { email, password, username } = req.body as {
    email?: string
    password?: string
    username?: string
  }

  if (!email || !password || !username) {
    return res.status(400).json({ error: "Missing required fields: email, password, username" })
  }

  if (username.length < 2 || username.length > 50) {
    return res.status(400).json({ error: "Username must be 2-50 characters" })
  }

  if (password.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters" })
  }

  try {
    // Check if email or username already taken
    const existing = await query(
      "SELECT id FROM users WHERE email = $1 OR username = $2",
      [email, username]
    )
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: "Email or username already registered" })
    }

    // Generate verification code
    const code = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

    // Store pending registration + code
    await query(
      `INSERT INTO email_verification_codes (email, code, expires_at)
       VALUES ($1, $2, $3)`,
      [email, code, expiresAt.toISOString()]
    )

    // Send verification email
    await sendVerificationCode(email, code)

    // Store hashed password temporarily in verification_codes (reuse email field for lookup)
    // We'll use a special prefix in the code field to store the pending registration data
    const pendingData = JSON.stringify({ username, passwordHash: await bcrypt.hash(password, 10) })
    await query(
      `INSERT INTO email_verification_codes (email, code, expires_at)
       VALUES ($1, $2, $3)`,
      [email, `pending:${pendingData}`, new Date(Date.now() + 30 * 60 * 1000).toISOString()]
    )

    res.json({ message: "Verification code sent to your email" })
  } catch (err) {
    console.error("Register error:", err)
    res.status(500).json({ error: "Registration failed" })
  }
})

// ============================================
// POST /api/auth/verify-email — Verify email code
// ============================================
router.post("/api/auth/verify-email", async (req, res) => {
  const { email, code } = req.body as { email?: string; code?: string }

  if (!email || !code) {
    return res.status(400).json({ error: "Missing required fields: email, code" })
  }

  try {
    // Find the pending registration data
    const pendingRows = await query(
      `SELECT code FROM email_verification_codes
       WHERE email = $1 AND code LIKE 'pending:%' AND expires_at > NOW()
       ORDER BY created_at DESC LIMIT 1`,
      [email]
    )

    if (pendingRows.rows.length === 0) {
      return res.status(400).json({ error: "No pending registration found. Please register again." })
    }

    const pendingData = JSON.parse(pendingRows.rows[0].code.replace("pending:", "")) as {
      username: string
      passwordHash: string
    }

    // Find the verification code
    const codeRows = await query(
      `SELECT id FROM email_verification_codes
       WHERE email = $1 AND code = $2 AND expires_at > NOW() AND used = FALSE
       ORDER BY created_at DESC LIMIT 1`,
      [email, code]
    )

    if (codeRows.rows.length === 0) {
      return res.status(400).json({ error: "Invalid or expired verification code" })
    }

    // Mark code as used
    await query("UPDATE email_verification_codes SET used = TRUE WHERE id = $1", [codeRows.rows[0].id])

    // Create user
    const insertResult = await query(
      `INSERT INTO users (username, email, email_verified, password_hash, auth_provider)
       VALUES ($1, $2, TRUE, $3, 'email')
       RETURNING id, username`,
      [pendingData.username, email, pendingData.passwordHash]
    )

    const userId = insertResult.rows[0].id
    const username = insertResult.rows[0].username

    // Clean up pending codes
    await query("DELETE FROM email_verification_codes WHERE email = $1", [email])

    const jwt = signToken({ userId, username })
    res.json({ token: jwt, username })
  } catch (err) {
    console.error("Verify email error:", err)
    res.status(500).json({ error: "Verification failed" })
  }
})

// ============================================
// POST /api/auth/login — Email/password login
// ============================================
router.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string }

  if (!email || !password) {
    return res.status(400).json({ error: "Missing required fields: email, password" })
  }

  try {
    const { rows } = await query(
      "SELECT id, username, password_hash FROM users WHERE email = $1",
      [email]
    )

    if (rows.length === 0) {
      return res.status(401).json({ error: "Invalid email or password" })
    }

    const user = rows[0]
    if (!user.password_hash) {
      return res.status(400).json({ error: "This account uses GitHub login. Please sign in with GitHub." })
    }

    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) {
      return res.status(401).json({ error: "Invalid email or password" })
    }

    const jwt = signToken({ userId: user.id, username: user.username })
    res.json({ token: jwt, username: user.username })
  } catch (err) {
    console.error("Login error:", err)
    res.status(500).json({ error: "Login failed" })
  }
})

// ============================================
// GET /api/auth/me — Get current user info
// ============================================
router.get("/api/auth/me", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { rows } = await query(
      "SELECT id, username, display_name, avatar_url, email, email_verified, auth_provider, bio, is_admin, created_at FROM users WHERE id = $1",
      [req.userId]
    )

    if (rows.length === 0) {
      return res.status(404).json({ error: "User not found" })
    }

    const user = rows[0]
    res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        auth_provider: user.auth_provider,
        is_admin: user.is_admin || false,
        created_at: user.created_at,
      },
      profile: {
        username: user.username,
        display_name: user.display_name,
        avatar_url: user.avatar_url,
        bio: user.bio,
      },
    })
  } catch (err) {
    console.error("Get user error:", err)
    res.status(500).json({ error: "Failed to get user info" })
  }
})

// ============================================
// POST /api/auth/api-token — Generate API token
// ============================================
router.post("/api/auth/api-token", authMiddleware, async (req: AuthRequest, res) => {
  const { name = "default" } = req.body as { name?: string }

  try {
    const rawToken = `tl_${uuidv4().replace(/-/g, "")}`
    const tokenHash = createHash("sha256").update(rawToken).digest("hex")
    const tokenPrefix = rawToken.slice(0, 10)

    await query(
      `INSERT INTO api_tokens (user_id, token_hash, token_prefix, name)
       VALUES ($1, $2, $3, $4)`,
      [req.userId, tokenHash, tokenPrefix, name]
    )

    res.json({ token: rawToken, prefix: tokenPrefix, name })
  } catch (err) {
    console.error("API token creation error:", err)
    res.status(500).json({ error: "Failed to create API token" })
  }
})

export function createAuthRoutes(): Router {
  return router
}
