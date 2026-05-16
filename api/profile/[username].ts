import type { VercelRequest, VercelResponse } from "@vercel/node"
import { supabase } from "../_lib/supabase"

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  if (!supabase) {
    return res.status(500).json({ error: "Server not configured" })
  }

  const { username } = req.query
  const urlParts = req.url?.split("/") || []
  // Extract the type from URL: /api/profile/username/daily
  // The [username] catch-all captures just the username part
  // We need to check if there's an additional path segment
  const typeIndex = urlParts.findIndex((p) => p === username) + 1
  const type = typeIndex < urlParts.length ? urlParts[typeIndex] : null

  try {
    // Get profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("username, display_name, avatar_url, bio")
      .eq("username", username as string)
      .single()

    if (profileError || !profile) {
      return res.status(404).json({ error: "User not found" })
    }

    // If no type specified, return just the profile
    if (!type) {
      return res.status(200).json({ profile })
    }

    // Validate type
    const validTypes = ["daily", "monthly", "session", "blocks"]
    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: `Invalid type. Use: ${validTypes.join(", ")}` })
    }

    // Get the latest submission of this type
    const { data: submission, error: submissionError } = await supabase
      .from("data_submissions")
      .select("payload, created_at")
      .eq("user_id", (await supabase.from("profiles").select("id").eq("username", username as string).single()).data?.id)
      .eq("submission_type", type)
      .order("created_at", { ascending: false })
      .limit(1)
      .single()

    if (submissionError || !submission) {
      return res.status(200).json({
        profile,
        data: null,
        updatedAt: null,
      })
    }

    return res.status(200).json({
      profile,
      data: submission.payload,
      updatedAt: submission.created_at,
    })
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message })
  }
}
