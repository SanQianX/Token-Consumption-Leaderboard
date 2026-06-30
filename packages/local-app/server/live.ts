import { watch, type FSWatcher } from "chokidar"
import { createReadStream, statSync } from "node:fs"
import { homedir } from "node:os"
import { join, sep } from "node:path"
import { createInterface } from "node:readline"
import { EventEmitter } from "node:events"
import { getLocalTimezone } from "./ccusage.js"
import { DAILY_CACHE_FILE } from "./cache.js"

export interface LiveDelta {
  ts: number
  model: string
  sessionId: string
  messageId: string
  inputTokens: number
  outputTokens: number
  cacheCreationTokens: number
  cacheReadTokens: number
}

export interface TodayTotals {
  date: string
  inputTokens: number
  outputTokens: number
  cacheCreationTokens: number
  cacheReadTokens: number
  totalTokens: number
}

export interface LiveSnapshot {
  today: TodayTotals
  recent: LiveDelta[]
  startedAt: number
  baselineAt: number
  baselineSource: "scan" | "cache"
}

const RECENT_LIMIT = 20
const CACHE_FILE = join(homedir(), ".claude", "projects")

function projectsRoot(): string {
  // chokidar on Windows: pass forward slashes to avoid it normalizing
  // backslashes away (which makes path matching silently fail).
  return CACHE_FILE.replaceAll(sep, "/")
}

function localDate(ts: number = Date.now()): string {
  const d = new Date(ts)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

function isSubagentPath(p: string): boolean {
  return p.includes(`${sep}subagents${sep}`)
}

interface CachedDaily {
  data?: {
    daily?: Array<{
      date?: string
      period?: string
      inputTokens?: number
      outputTokens?: number
      cacheCreationTokens?: number
      cacheReadTokens?: number
      totalTokens?: number
    }>
  }
  updatedAt?: string
  timezone?: string
}

async function tryLoadBaselineFromCache(today: string): Promise<TodayTotals | null> {
  // Primary path matches what cache.ts writes to (resolved relative to its __dirname,
  // so it works in both dev mode and npm-global mode). The cwd-based candidates were
  // a heuristic for dev that misses the npm install layout where cwd is unrelated.
  const candidates = [
    DAILY_CACHE_FILE,
    join(process.cwd(), "packages", "local-app", ".cache", "daily.json"),
    join(process.cwd(), ".cache", "daily.json"),
    join(homedir(), ".tokboard", ".cache", "daily.json"),
  ]
  for (const file of candidates) {
    try {
      const fs = await import("node:fs/promises")
      const raw = await fs.readFile(file, "utf-8")
      const parsed = JSON.parse(raw) as CachedDaily
      if (parsed.timezone !== getLocalTimezone()) continue
      const today_ = parsed.data?.daily?.find(
        (e) => (e.date ?? e.period) === today
      )
      if (!today_) continue
      const inputTokens = today_.inputTokens ?? 0
      const outputTokens = today_.outputTokens ?? 0
      const cacheCreationTokens = today_.cacheCreationTokens ?? 0
      const cacheReadTokens = today_.cacheReadTokens ?? 0
      return {
        date: today,
        inputTokens,
        outputTokens,
        cacheCreationTokens,
        cacheReadTokens,
        totalTokens: inputTokens + outputTokens + cacheCreationTokens + cacheReadTokens,
      }
    } catch {
      continue
    }
  }
  return null
}

async function collectExistingJsonlFiles(): Promise<string[]> {
  const fs = await import("node:fs/promises")
  const path = await import("node:path")
  type Dirent = import("node:fs").Dirent<string>
  const out: string[] = []
  async function walk(dir: string): Promise<void> {
    let entries: Dirent[]
    try {
      entries = (await fs.readdir(dir, { withFileTypes: true })) as Dirent[]
    } catch {
      return
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        if (entry.name === "subagents") continue
        await walk(full)
      } else if (entry.isFile() && entry.name.endsWith(".jsonl")) {
        if (isSubagentPath(full)) continue
        out.push(full)
      }
    }
  }
  await walk(projectsRoot())
  return out
}

function parseAssistantLine(line: string): LiveDelta | null {
  if (!line.trim()) return null
  try {
    const row = JSON.parse(line)
    if (row?.type !== "assistant") return null
    const u = row?.message?.usage
    if (!u) return null
    const tsRaw = row.timestamp ?? row.message?.createdAt ?? row.message?.timestamp
    const ts = tsRaw ? new Date(tsRaw).getTime() : Date.now()
    return {
      ts,
      model: row.message?.model ?? "unknown",
      sessionId: row.sessionId ?? "",
      messageId: row.message?.id ?? "",
      inputTokens: u.input_tokens ?? 0,
      outputTokens: u.output_tokens ?? 0,
      cacheCreationTokens: u.cache_creation_input_tokens ?? 0,
      cacheReadTokens: u.cache_read_input_tokens ?? 0,
    }
  } catch {
    return null
  }
}

async function parseFileForBaseline(file: string, today: string): Promise<TodayTotals> {
  const totals: TodayTotals = {
    date: today,
    inputTokens: 0,
    outputTokens: 0,
    cacheCreationTokens: 0,
    cacheReadTokens: 0,
    totalTokens: 0,
  }
  const seen = state.seenIds.get(file) ?? new Set<string>()
  state.seenIds.set(file, seen)
  return new Promise<TodayTotals>((resolve) => {
    const stream = createReadStream(file, { encoding: "utf-8" })
    const rl = createInterface({ input: stream, crlfDelay: Infinity })
    rl.on("line", (line) => {
      const d = parseAssistantLine(line)
      if (!d) return
      // ccusage deduplicates by message.id — when Claude Code resumes a
      // session, the entire history is re-appended with the same message
      // ids, so without dedup we double-count.
      if (d.messageId) {
        if (seen.has(d.messageId)) return
        seen.add(d.messageId)
      }
      if (localDate(d.ts) !== today) return
      totals.inputTokens += d.inputTokens
      totals.outputTokens += d.outputTokens
      totals.cacheCreationTokens += d.cacheCreationTokens
      totals.cacheReadTokens += d.cacheReadTokens
    })
    rl.on("close", () => {
      totals.totalTokens =
        totals.inputTokens +
        totals.outputTokens +
        totals.cacheCreationTokens +
        totals.cacheReadTokens
      resolve(totals)
    })
    rl.on("error", () => {
      resolve(totals)
    })
  })
}

interface State {
  today: TodayTotals
  recent: LiveDelta[]
  startedAt: number
  baselineAt: number
  baselineSource: "scan" | "cache"
  offsets: Map<string, number>
  fileLocks: Map<string, Promise<void>>
  seenIds: Map<string, Set<string>>
  seenIdsReady: Map<string, Promise<void>>
  watcher: FSWatcher | null
  starting: boolean
  emitter: EventEmitter
  todayStr: string
}

function createState(): State {
  return {
    today: {
      date: localDate(),
      inputTokens: 0,
      outputTokens: 0,
      cacheCreationTokens: 0,
      cacheReadTokens: 0,
      totalTokens: 0,
    },
    recent: [],
    startedAt: Date.now(),
    baselineAt: 0,
    baselineSource: "scan",
    offsets: new Map(),
    fileLocks: new Map(),
    seenIds: new Map(),
    seenIdsReady: new Map(),
    watcher: null,
    starting: false,
    emitter: new EventEmitter(),
    todayStr: localDate(),
  }
}

const state = createState()

export function getSnapshot(): LiveSnapshot {
  return {
    today: { ...state.today },
    recent: state.recent.slice(),
    startedAt: state.startedAt,
    baselineAt: state.baselineAt,
    baselineSource: state.baselineSource,
  }
}

export function subscribe(fn: (snap: LiveSnapshot) => void): () => void {
  state.emitter.on("update", fn)
  return () => state.emitter.off("update", fn)
}

function emitUpdate(): void {
  state.emitter.emit("update", getSnapshot())
}

export async function refreshLiveBaselineFromCache(): Promise<boolean> {
  rollOverDateIfNeeded()
  const cached = await tryLoadBaselineFromCache(state.todayStr)
  if (!cached) return false

  state.today = cached
  state.baselineSource = "cache"
  state.baselineAt = Date.now()
  emitUpdate()
  return true
}

function rollOverDateIfNeeded(): boolean {
  const now = localDate()
  if (now !== state.todayStr) {
    state.todayStr = now
    state.today = {
      date: now,
      inputTokens: 0,
      outputTokens: 0,
      cacheCreationTokens: 0,
      cacheReadTokens: 0,
      totalTokens: 0,
    }
    state.recent = []
    // offsets and seenIds persist across days — a message.id is either seen
    // once globally or never; the per-day totals are reconstructed from the
    // date filter alone.
    return true
  }
  return false
}

async function populateSeenIds(file: string): Promise<void> {
  // Register the in-flight promise so that concurrent readNewLines calls
  // can wait for it before processing new lines. Without this guard,
  // a change event arriving mid-scan would let old message IDs through
  // the dedup check (seenIds empty) and double-count them.
  const existing = state.seenIdsReady.get(file)
  if (existing) return existing

  const seen = state.seenIds.get(file) ?? new Set<string>()
  state.seenIds.set(file, seen)

  const promise = new Promise<void>((resolve) => {
    const stream = createReadStream(file, { encoding: "utf-8" })
    const rl = createInterface({ input: stream, crlfDelay: Infinity })
    rl.on("line", (line) => {
      const d = parseAssistantLine(line)
      if (!d || !d.messageId) return
      seen.add(d.messageId)
    })
    rl.on("close", () => resolve())
    rl.on("error", () => resolve())
  }).finally(() => {
    state.seenIdsReady.delete(file)
  })
  state.seenIdsReady.set(file, promise)
  return promise
}

async function readNewLines(file: string): Promise<void> {
  rollOverDateIfNeeded()

  let stat
  try {
    stat = statSync(file)
  } catch {
    return
  }

  const knownOffset = state.offsets.get(file) ?? 0
  if (stat.size < knownOffset) {
    // Truncate or rotate: reset offset AND clear seen ids for this file,
    // since a rotation likely produced a fresh log that may re-emit
    // historical message ids.
    state.offsets.set(file, 0)
    state.seenIds.delete(file)
    state.seenIdsReady.delete(file)
  }
  const start = state.offsets.get(file) ?? 0
  if (start >= stat.size) return

  // Wait for any in-flight populateSeenIds scan to finish before processing
  // new lines. Otherwise the dedup check below would see an empty seenIds
  // set and re-count historical message IDs that the baseline already
  // accounted for.
  const ready = state.seenIdsReady.get(file)
  if (ready) {
    try { await ready } catch { /* ignore */ }
  }

  const seen = state.seenIds.get(file) ?? new Set<string>()
  state.seenIds.set(file, seen)

  await new Promise<void>((resolve) => {
    const stream = createReadStream(file, { start, encoding: "utf-8" })
    const rl = createInterface({ input: stream, crlfDelay: Infinity })
    let lastSize = start

    rl.on("line", (line) => {
      const d = parseAssistantLine(line)
      if (!d) return
      if (d.messageId) {
        if (seen.has(d.messageId)) return
        seen.add(d.messageId)
      }
      if (localDate(d.ts) !== state.todayStr) return

      state.today.inputTokens += d.inputTokens
      state.today.outputTokens += d.outputTokens
      state.today.cacheCreationTokens += d.cacheCreationTokens
      state.today.cacheReadTokens += d.cacheReadTokens
      state.today.totalTokens =
        state.today.inputTokens +
        state.today.outputTokens +
        state.today.cacheCreationTokens +
        state.today.cacheReadTokens

      state.recent.push(d)
      if (state.recent.length > RECENT_LIMIT) {
        state.recent.splice(0, state.recent.length - RECENT_LIMIT)
      }
    })

    stream.on("end", () => {
      lastSize = stat.size
      state.offsets.set(file, lastSize)
      resolve()
    })
    stream.on("error", () => {
      resolve()
    })
  })
}

function processFileSerial(file: string): Promise<void> {
  const prev = state.fileLocks.get(file) ?? Promise.resolve()
  const next = prev.then(() => readNewLines(file)).catch(() => {})
  state.fileLocks.set(file, next)
  return next
}

function onFileEvent(file: string): void {
  if (isSubagentPath(file)) return
  processFileSerial(file).then(() => {
    if (state.recent.length > 0) emitUpdate()
  })
}

export function startLiveWatcher(): void {
  if (state.starting || state.watcher) return
  state.starting = true
  state.emitter.setMaxListeners(0)

  void (async () => {
    const today = state.todayStr
    const cached = await tryLoadBaselineFromCache(today)
    if (cached) {
      state.today = cached
      state.baselineSource = "cache"
    } else {
      const files = await collectExistingJsonlFiles()
      const agg: TodayTotals = {
        date: today,
        inputTokens: 0,
        outputTokens: 0,
        cacheCreationTokens: 0,
        cacheReadTokens: 0,
        totalTokens: 0,
      }
      // Bounded-parallel scan: 464 files @ 10MB each is too slow sequentially
      // (minutes) on Windows. Cap concurrency at 16 to keep memory / fd
      // pressure bounded.
      const CONCURRENCY = 16
      let cursor = 0
      async function worker(): Promise<void> {
        while (cursor < files.length) {
          const idx = cursor++
          const f = files[idx]
          try {
            const t = await parseFileForBaseline(f, today)
            agg.inputTokens += t.inputTokens
            agg.outputTokens += t.outputTokens
            agg.cacheCreationTokens += t.cacheCreationTokens
            agg.cacheReadTokens += t.cacheReadTokens
          } catch {
            // ignore unreadable files
          }
        }
      }
      await Promise.all(
        Array.from({ length: Math.min(CONCURRENCY, files.length) }, () => worker())
      )
      agg.totalTokens =
        agg.inputTokens +
        agg.outputTokens +
        agg.cacheCreationTokens +
        agg.cacheReadTokens
      state.today = agg
      state.baselineSource = "scan"
    }
    state.baselineAt = Date.now()
    emitUpdate()

    // Periodic date-rollover check: rollOverDateIfNeeded only fires inside
    // readNewLines (i.e. on file change). If no JSONL is touched between
    // midnight and when the user opens the dashboard, the LiveCounter would
    // stay stuck on yesterday's date. Poll once a minute to catch the
    // rollover and emit a fresh snapshot so connected SSE clients update.
    const rolloverCheck = setInterval(() => {
      if (rollOverDateIfNeeded()) {
        console.log("[live] date rolled over to", state.todayStr)
        emitUpdate()
      }
    }, 60_000)
    rolloverCheck.unref()

    state.watcher = watch(projectsRoot(), {
      ignoreInitial: false,
      persistent: true,
      depth: 10,
      usePolling: true,
      interval: 500,
      binaryInterval: 1000,
      ignored: (p: string, stats?: { isDirectory?: () => boolean; isFile?: () => boolean }) => {
        if (isSubagentPath(p)) return true
        if (stats?.isDirectory()) return false
        if (stats?.isFile()) return !p.endsWith(".jsonl")
        return false
      },
    })

    state.watcher.on("ready", () => console.log("[live] watcher ready"))
    state.watcher.on("add", (p: string) => {
      // For existing files discovered at startup, baseline already counted
      // them — record the current size as offset so we skip the historical
      // content. We still need to scan historical message IDs into seenIds
      // so that a later session-resume (which re-appends the whole history)
      // doesn't double-count them.
      // For genuinely new files created mid-session, baseline didn't see
      // them, so we leave offset at 0 (or unset) so that the subsequent
      // change handler reads from the start.
      if (state.offsets.has(p)) return
      try {
        const sz = statSync(p).size
        if (state.baselineAt > 0) {
          // File created after startup — treat as truly new
          return
        }
        state.offsets.set(p, sz)
        // Populate seenIds without re-counting tokens (baseline already did)
        populateSeenIds(p).catch(() => {})
      } catch {
        // ignore
      }
    })
    state.watcher.on("change", (p: string) => {
      onFileEvent(p)
    })
    state.watcher.on("error", (err: unknown) => {
      console.error("[live] watcher error:", err)
    })
    console.log("[live] watcher started on:", projectsRoot())
  })().catch((err) => {
    console.error("[live] failed to start:", err)
  }).finally(() => {
    state.starting = false
  })
}
