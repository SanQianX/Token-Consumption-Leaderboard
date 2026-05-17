import type { Request, Response, NextFunction } from "express"
import { verifyToken } from "../utils/token.js"
import { query } from "../db/client.js"

export interface AuthRequest extends Request {
  userId?: string
  username?: string
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  // Try Bearer token first
  const authHeader = req.headers.authorization
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7)
    const payload = verifyToken(token)
    if (payload) {
      req.userId = payload.userId
      req.username = payload.username
      return next()
    }
  }

  // Try X-API-Token header
  const apiToken = req.headers["x-api-token"] as string | undefined
  if (apiToken) {
    // API token verification — handled in submit route
    req.userId = undefined
    req.username = undefined
    res.locals.apiToken = apiToken
    return next()
  }

  return res.status(401).json({ error: "Not authenticated" })
}

export function optionalAuth(req: AuthRequest, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7)
    const payload = verifyToken(token)
    if (payload) {
      req.userId = payload.userId
      req.username = payload.username
    }
  }
  next()
}

export async function adminMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.userId) {
    return res.status(401).json({ error: "Not authenticated" })
  }

  const { rows } = await query("SELECT is_admin FROM users WHERE id = $1", [req.userId])
  if (!rows.length || !rows[0].is_admin) {
    return res.status(403).json({ error: "Admin access required" })
  }

  next()
}
