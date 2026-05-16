import type { VercelRequest, VercelResponse } from "@vercel/node"
import { supabase } from "../_lib/supabase"

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  if (!supabase) {
    return res.status(500).json({ error: "Server not configured" })
  }

  const code = req.query.code as string
  if (!code) {
    return res.redirect("/")
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    return res.status(500).json({ error: error.message })
  }

  // Redirect to home page after successful auth
  const origin = req.headers.origin || "http://localhost:5173"
  return res.redirect(origin)
}
