import express from "express"
import cors from "cors"
import path from "node:path"
import { existsSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { router } from "./routes.js"
import { startSubmitWorker } from "./submit-worker.js"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export function createApp() {
  const app = express()
  app.use(cors())
  app.use(express.json())
  app.use(router)

  // Serve built frontend (production mode)
  const frontendDist = path.join(__dirname, "..", "dist")
  if (existsSync(frontendDist)) {
    app.use(express.static(frontendDist))
    // SPA fallback — only for non-API GET requests
    app.get("/{*path}", (req, res, next) => {
      if (req.path.startsWith("/api")) return next()
      res.sendFile(path.join(frontendDist, "index.html"))
    })
  }

  return app
}

export function startServer(port = 3001) {
  const app = createApp()
  app.listen(port, () => {
    console.log(`Token Leaderboard running at http://localhost:${port}`)
    startSubmitWorker()
  })
}

// Auto-start when run directly (tsx watch / node bin)
const isMainModule = process.argv[1]?.replace(/\\/g, "/").endsWith("server/index.ts")
  || process.argv[1]?.replace(/\\/g, "/").endsWith("server/bin.ts")
if (isMainModule) {
  startServer()
}
