import express from "express"
import cors from "cors"
import path from "node:path"
import { existsSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { router } from "./routes.js"

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

export function startServer(port = 7842) {
  const app = createApp()
  app.listen(port, () => {
    console.log(`Tokboard running at http://localhost:${port}`)
  })
}

// Auto-start when run via tsx watch (dev mode)
const isMainModule = process.argv[1]?.replace(/\\/g, "/").endsWith("server/index.ts")
if (isMainModule) {
  startServer()
}
