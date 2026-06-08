import { execFile } from "node:child_process"

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

  return new Promise((resolve, reject) => {
    execFile("bun", ["x", "ccusage@20.0.6", ...args], {
      maxBuffer: 10 * 1024 * 1024,
      timeout: 120_000,
      env: { ...process.env },
      windowsHide: true,
      shell: false,
    }, (err, stdout, stderr) => {
      if (err) {
        reject(new Error(`ccusage failed: ${err.message}\n${stderr?.slice(0, 200)}`))
        return
      }
      resolve(stdout)
    })
  })
}
