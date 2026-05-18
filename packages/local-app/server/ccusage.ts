import { exec } from "node:child_process"
import { promisify } from "node:util"

const execAsync = promisify(exec)

export interface CcusageOptions {
  since?: string
  until?: string
  offline?: boolean
  project?: string
}

function buildArgs(
  command: string,
  options: CcusageOptions = {},
): string[] {
  const args = [command, "--json"]

  if (options.since) args.push("--since", options.since)
  if (options.until) args.push("--until", options.until)
  if (options.offline) args.push("--offline")
  if (options.project) args.push("--project", options.project)

  return args
}

export async function runCcusage(
  command: string,
  options: CcusageOptions = {},
): Promise<string> {
  const args = buildArgs(command, options)
  const cmd = ["npx", "ccusage@18.0.11", ...args].join(" ")

  const { stdout } = await execAsync(cmd, {
    maxBuffer: 10 * 1024 * 1024,
    timeout: 120_000,
  })

  return stdout
}
