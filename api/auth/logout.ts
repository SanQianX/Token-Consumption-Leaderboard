import type { VercelRequest, VercelResponse } from "@vercel/node"
import { supabase } from "../_lib/supabase"

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  if (!supabase) {
    return res.status(500).json({ error: "Server not configured" })
  }

  const { error } = await supabase.auth.signOut()

  if (error) {
    return res.status(500).json({ error: error.message })
  }

  return res.status(200).json({ message: "Logged out successfully" })
}
