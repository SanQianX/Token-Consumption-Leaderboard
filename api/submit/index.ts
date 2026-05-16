import type { VercelRequest, VercelResponse } from "@vercel/node"
import { supabase } from "../_lib/supabase"
import { createHash } from "crypto"

interface SubmitPayload {
  type: "daily" | "monthly" | "session" | "blocks"
  payload: Record<string, unknown>
  token: string
}

async function verifyGitHubToken(token: string): Promise<{ id: number; login: string } | null> {
  try {
    const res = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `token ${token}`,
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "token-leaderboard",
      },
    })
    if (!res.ok) return null
    const data = await res.json()
    return { id: data.id, login: data.login }
  } catch {
    return null
  }
}

function generateHash(userId: string, type: string, payload: Record<string, unknown>): string {
  const payloadStr = JSON.stringify(payload)
  return createHash("md5")
    .update(userId + type + createHash("md5").update(payloadStr).digest("hex")
    )
    .digest("hex")
}

function extractTotals(
  type: string,
  payload: Record<string, unknown>,
): { totalTokens: number; totalCost: number } {
  const totals = payload.totals as Record<string, unknown> | undefined
  if (totals) {
    return {
      totalTokens: (totals.totalTokens as number) || 0,
      totalCost: (totals.totalCost as number) || 0,
    }
  }
  // For blocks type, sum from blocks array
  if (type === "blocks" && Array.isArray(payload.blocks)) {
    const blocks = payload.blocks as Record<string, unknown>[]
    return {
      totalTokens: blocks.reduce((sum, b) => sum + ((b.totalTokens as number) || 0), 0),
      totalCost: blocks.reduce((sum, b) => sum + ((b.costUSD as number) || 0), 0),
    }
  }
  return { totalTokens: 0, totalCost: 0 }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  if (!supabase) {
    return res.status(500).json({ error: "Server not configured" })
  }

  const { type, payload, token } = req.body as SubmitPayload

  // Validate required fields
  if (!type || !payload || !token) {
    return res.status(400).json({ error: "Missing required fields: type, payload, token" })
  }

  const validTypes = ["daily", "monthly", "session", "blocks"]
  if (!validTypes.includes(type)) {
    return res.status(400).json({ error: `Invalid type. Use: ${validTypes.join(", ")}` })
  }

  // Verify GitHub token
  const githubUser = await verifyGitHubToken(token)
  if (!githubUser) {
    return res.status(401).json({ error: "Invalid GitHub token" })
  }

  // Find matching profile
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, username")
    .eq("github_id", githubUser.id)
    .single()

  if (profileError || !profile) {
    return res.status(404).json({
      error: "No profile found. Please sign in via the website first.",
    })
  }

  // Generate dedup hash
  const dataHash = generateHash(profile.id, type, payload)

  // Check for duplicate
  const { data: existing } = await supabase
    .from("data_submissions")
    .select("id")
    .eq("data_hash", dataHash)
    .single()

  if (existing) {
    return res.status(200).json({
      message: "Data already submitted (duplicate detected)",
      duplicate: true,
    })
  }

  // Extract totals
  const { totalTokens, totalCost } = extractTotals(type, payload)

  // Insert submission
  const { error: insertError } = await supabase
    .from("data_submissions")
    .insert({
      user_id: profile.id,
      submission_type: type,
      payload,
      data_hash: dataHash,
      total_tokens: totalTokens,
      total_cost: totalCost,
    })

  if (insertError) {
    return res.status(500).json({ error: insertError.message })
  }

  return res.status(200).json({
    message: "Data submitted successfully",
    username: profile.username,
    totalTokens,
    totalCost,
  })
}
