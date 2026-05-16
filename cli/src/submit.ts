import { Command } from "commander"
import { exec } from "node:child_process"
import { promisify } from "node:util"

const execAsync = promisify(exec)

const API_URL = process.env.TOKEN_LEADERBOARD_URL || "https://token-leaderboard.vercel.app"

const TYPES = ["daily", "monthly", "session", "blocks"] as const
type SubmissionType = (typeof TYPES)[number]

interface SubmitOptions {
  token: string
  type: string
  dryRun: boolean
  apiUrl: string
}

async function runCcusage(type: string): Promise<string> {
  const cmd = `npx ccusage@latest ${type} --json`
  const { stdout } = await execAsync(cmd, {
    maxBuffer: 10 * 1024 * 1024,
    timeout: 120_000,
  })
  return stdout.trim()
}

function validateData(type: string, data: Record<string, unknown>): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  // Check that the expected key exists
  const typeKey = type === "session" ? "sessions" : type
  if (!data[typeKey] || !Array.isArray(data[typeKey])) {
    if (type !== "blocks" || !data.blocks || !Array.isArray(data.blocks)) {
      errors.push(`Missing or invalid '${typeKey}' array in response`)
    }
  }

  // Check totals exist (except blocks)
  if (type !== "blocks") {
    if (!data.totals || typeof data.totals !== "object") {
      errors.push("Missing 'totals' object")
    } else {
      const totals = data.totals as Record<string, unknown>
      if (typeof totals.totalTokens !== "number" || totals.totalTokens < 0) {
        errors.push("Invalid totalTokens in totals")
      }
      if (typeof totals.totalCost !== "number" || totals.totalCost < 0) {
        errors.push("Invalid totalCost in totals")
      }
    }
  }

  return { valid: errors.length === 0, errors }
}

export const submitCommand = new Command("submit")
  .description("Submit your token usage data to the leaderboard")
  .requiredOption("-t, --token <token>", "GitHub Personal Access Token (or set TOKEN_LEADERBOARD_TOKEN env var)", process.env.TOKEN_LEADERBOARD_TOKEN || "")
  .option("--type <type>", "Submission type: daily, monthly, session, blocks, or all", "all")
  .option("--dry-run", "Preview data without submitting", false)
  .option("--api-url <url>", "API URL", API_URL)
  .action(async (options: SubmitOptions) => {
    if (!options.token) {
      console.error("Error: GitHub token is required. Use --token or set TOKEN_LEADERBOARD_TOKEN env var.")
      process.exit(1)
    }

    const typesToSubmit: SubmissionType[] =
      options.type === "all" ? [...TYPES] : [options.type as SubmissionType]

    const validTypes = typesToSubmit.filter((t) => TYPES.includes(t))
    if (validTypes.length === 0) {
      console.error(`Error: Invalid type '${options.type}'. Use: ${TYPES.join(", ")}, or all`)
      process.exit(1)
    }

    for (const type of validTypes) {
      console.log(`\n--- Collecting ${type} data ---`)

      try {
        const rawOutput = await runCcusage(type)
        let data: Record<string, unknown>

        try {
          data = JSON.parse(rawOutput)
        } catch {
          console.error(`  Failed to parse ccusage output for ${type}`)
          continue
        }

        // Validate
        const validation = validateData(type, data)
        if (!validation.valid) {
          console.error(`  Validation errors for ${type}:`)
          validation.errors.forEach((e) => console.error(`    - ${e}`))
          continue
        }

        // Extract summary
        const totals = data.totals as Record<string, unknown> | undefined
        const totalTokens = totals?.totalTokens ?? "N/A"
        const totalCost = totals?.totalCost ?? "N/A"
        console.log(`  Total Tokens: ${totalTokens}`)
        console.log(`  Total Cost: ${totalCost}`)

        if (options.dryRun) {
          console.log(`  [DRY RUN] Would submit ${type} data to ${options.apiUrl}`)
          continue
        }

        // Submit
        console.log(`  Submitting to ${options.apiUrl}/api/submit ...`)
        const res = await fetch(`${options.apiUrl}/api/submit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type,
            payload: data,
            token: options.token,
          }),
        })

        const result = await res.json() as Record<string, unknown>

        if (!res.ok) {
          console.error(`  Failed (${res.status}): ${result.error || "Unknown error"}`)
          continue
        }

        if (result.duplicate) {
          console.log(`  Already submitted (duplicate detected)`)
        } else {
          console.log(`  Successfully submitted!`)
          console.log(`  Username: ${result.username}`)
        }
      } catch (err) {
        console.error(`  Error processing ${type}: ${(err as Error).message}`)
      }
    }

    console.log("\nDone!")
  })
