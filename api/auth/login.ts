import type { VercelRequest, VercelResponse } from "@vercel/node"
import { supabase } from "../_lib/supabase"

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  if (!supabase) {
    return res.status(500).json({ error: "Server not configured" })
  }

  const redirectTo = (req.query.redirectTo as string) || `${req.headers.origin || "http://localhost:5173"}/auth/callback`

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "github",
    options: {
      redirectTo,
    },
  })

  if (error) {
    return res.status(500).json({ error: error.message })
  }

  if (data.url) {
    return res.redirect(data.url)
  }

  return res.status(500).json({ error: "Failed to initiate OAuth" })
}
