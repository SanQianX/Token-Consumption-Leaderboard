import { readFile, writeFile, mkdir } from "node:fs/promises"
import { join } from "node:path"
import { existsSync } from "node:fs"
import { homedir } from "node:os"

export interface Settings {
  serverUrl: string
  apiToken: string
  submitIntervalMinutes: number
  autoSubmitEnabled: boolean
}

const DEFAULT_SETTINGS: Settings = {
  serverUrl: "https://124.220.17.38",
  apiToken: "",
  submitIntervalMinutes: 30,
  autoSubmitEnabled: false,
}

function getSettingsDir(): string {
  return join(homedir(), ".token-leaderboard")
}

function getSettingsPath(): string {
  return join(getSettingsDir(), "settings.json")
}

export async function loadSettings(): Promise<Settings> {
  try {
    const raw = await readFile(getSettingsPath(), "utf-8")
    const saved = JSON.parse(raw) as Partial<Settings>
    return { ...DEFAULT_SETTINGS, ...saved }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export async function saveSettings(settings: Settings): Promise<void> {
  const dir = getSettingsDir()
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true })
  }
  await writeFile(getSettingsPath(), JSON.stringify(settings, null, 2), "utf-8")
}
