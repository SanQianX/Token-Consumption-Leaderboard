import type { VercelRequest, VercelResponse } from "@vercel/node"
import { supabase } from "../_lib/supabase"

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  if (!supabase) {
    return res.status(500).json({ error: "Server not configured" })
  }

  // Get the authorization header
  const authHeader = req.headers.authorization
  if (!authHeader) {
    return res.status(401).json({ error: "Not authenticated" })
  }

  const token = authHeader.replace("Bearer ", "")

  const { data: { user }, error } = await supabase.auth.getUser(token)

  if (error || !user) {
    return res.status(401).json({ error: "Invalid token" })
  }

  // Get profile
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("username, display_name, avatar_url, bio")
    .eq("id", user.id)
    .single()

  if (profileError) {
    return res.status(404).json({ error: "Profile not found" })
  }

  return res.status(200).json({
    user: {
      id: user.id,
      email: user.email,
    },
    profile,
  })
}
