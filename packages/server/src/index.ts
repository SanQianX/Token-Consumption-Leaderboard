import express from "express"
import cors from "cors"
import { createAuthRoutes } from "./routes/auth.js"
import { createLeaderboardRoutes } from "./routes/leaderboard.js"
import { createProfileRoutes } from "./routes/profile.js"
import { createSubmitRoutes } from "./routes/submit.js"
import { createAdminRoutes } from "./routes/admin.js"
import { refreshLeaderboardCache } from "./services/leaderboard-cache.js"

const app = express()
const PORT = parseInt(process.env.PORT || "3000")

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173"

app.use(cors({
  origin: [FRONTEND_URL, "http://localhost:5173", "http://localhost:3001"],
  credentials: true,
}))
app.use(express.json({ limit: "10mb" }))

// Routes
app.use(createAuthRoutes())
app.use(createLeaderboardRoutes())
app.use(createProfileRoutes())
app.use(createSubmitRoutes())
app.use(createAdminRoutes())

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() })
})

app.listen(PORT, () => {
  console.log(`Remote server running at http://localhost:${PORT}`)

  // Initial cache refresh
  refreshLeaderboardCache().catch(console.error)

  // Refresh cache every hour
  setInterval(() => {
    refreshLeaderboardCache().catch(console.error)
  }, 60 * 60 * 1000)
})
