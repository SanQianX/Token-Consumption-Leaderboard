import type { DailyEntry } from "@/lib/types"

export interface CoachSettings {
  dailyTokenGoal: number
  warmupThreshold: number
  effectiveThreshold: number
  deepWorkThreshold: number
}

export interface UsageLevel {
  id: "idle" | "warmup" | "effective" | "deep"
  label: string
  description: string
  nextLabel: string | null
  nextTarget: number | null
}

export interface WeekStats {
  effectiveDays: number
  totalTokens: number
}

export interface RingMetrics {
  date: string
  label: string
  totalTokens: number
  totalCost: number
  volumeProgress: number
  deepWorkScore: number
  consistencyProgress: number
  effectiveDaysLast7: number
  streak: number
  level: UsageLevel
}

export const COACH_SETTINGS_STORAGE_KEY = "tokboard.coach-settings"

export const DEFAULT_COACH_SETTINGS: CoachSettings = {
  dailyTokenGoal: 100_000,
  warmupThreshold: 5_000,
  effectiveThreshold: 30_000,
  deepWorkThreshold: 100_000,
}

const DAY_MS = 24 * 60 * 60 * 1000

export function localDateKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

function clampPositive(value: unknown, fallback: number): number {
  const n = Number(value)
  if (!Number.isFinite(n) || n <= 0) return fallback
  return Math.round(n)
}

export function normalizeCoachSettings(value: Partial<CoachSettings> | null | undefined): CoachSettings {
  const settings = {
    dailyTokenGoal: clampPositive(value?.dailyTokenGoal, DEFAULT_COACH_SETTINGS.dailyTokenGoal),
    warmupThreshold: clampPositive(value?.warmupThreshold, DEFAULT_COACH_SETTINGS.warmupThreshold),
    effectiveThreshold: clampPositive(value?.effectiveThreshold, DEFAULT_COACH_SETTINGS.effectiveThreshold),
    deepWorkThreshold: clampPositive(value?.deepWorkThreshold, DEFAULT_COACH_SETTINGS.deepWorkThreshold),
  }

  settings.effectiveThreshold = Math.max(settings.effectiveThreshold, settings.warmupThreshold)
  settings.deepWorkThreshold = Math.max(settings.deepWorkThreshold, settings.effectiveThreshold)
  settings.dailyTokenGoal = Math.max(settings.dailyTokenGoal, settings.warmupThreshold)

  return settings
}

export function parseStoredCoachSettings(raw: string | null): CoachSettings {
  if (!raw) return DEFAULT_COACH_SETTINGS

  try {
    return normalizeCoachSettings(JSON.parse(raw) as Partial<CoachSettings>)
  } catch {
    return DEFAULT_COACH_SETTINGS
  }
}

export function getTodayTokens(entries: DailyEntry[], referenceDate = new Date()): number {
  const today = localDateKey(referenceDate)
  return entries
    .filter((entry) => entry.date === today)
    .reduce((sum, entry) => sum + entry.totalTokens, 0)
}

export function getGoalProgress(totalTokens: number, dailyTokenGoal: number): number {
  if (dailyTokenGoal <= 0) return 0
  return Math.min(100, Math.round((totalTokens / dailyTokenGoal) * 100))
}

function dateFromKey(date: string): Date {
  const [year, month, day] = date.split("-").map(Number)
  return new Date(year, month - 1, day)
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function shortDateLabel(date: string): string {
  const d = dateFromKey(date)
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

function aggregateDailyEntries(entries: DailyEntry[]) {
  const map = new Map<string, Pick<DailyEntry, "date" | "totalTokens" | "totalCost">>()

  for (const entry of entries) {
    const current = map.get(entry.date)
    if (!current) {
      map.set(entry.date, {
        date: entry.date,
        totalTokens: entry.totalTokens,
        totalCost: entry.totalCost,
      })
      continue
    }

    map.set(entry.date, {
      date: entry.date,
      totalTokens: current.totalTokens + entry.totalTokens,
      totalCost: current.totalCost + entry.totalCost,
    })
  }

  return map
}

export function getUsageLevel(totalTokens: number, settings: CoachSettings): UsageLevel {
  if (totalTokens >= settings.deepWorkThreshold) {
    return {
      id: "deep",
      label: "Deep AI workday",
      description: "AI is carrying meaningful work with you today.",
      nextLabel: null,
      nextTarget: null,
    }
  }

  if (totalTokens >= settings.effectiveThreshold) {
    return {
      id: "effective",
      label: "Effective collaboration",
      description: "You have moved beyond light assistance into real AI leverage.",
      nextLabel: "Deep work",
      nextTarget: settings.deepWorkThreshold,
    }
  }

  if (totalTokens >= settings.warmupThreshold) {
    return {
      id: "warmup",
      label: "Light assistance",
      description: "AI is present, but it can take on more planning, review, and iteration.",
      nextLabel: "Effective collaboration",
      nextTarget: settings.effectiveThreshold,
    }
  }

  return {
    id: "idle",
    label: "Low AI leverage",
    description: "Today has not yet turned into an AI-assisted work session.",
    nextLabel: "Light assistance",
    nextTarget: settings.warmupThreshold,
  }
}

export function getCoachSuggestion(level: UsageLevel["id"]): string {
  if (level === "deep") {
    return "Great pace. Use the momentum for tests, review, cleanup, and a short end-of-day recap."
  }

  if (level === "effective") {
    return "Push one more task through AI: ask for edge cases, refactoring options, or a focused review."
  }

  if (level === "warmup") {
    return "Hand AI a larger slice: planning, implementation, test cases, or summarizing the current blockers."
  }

  return "Start with one concrete prompt: ask AI to break down your next task or review the code you touched today."
}

export function computeCurrentStreak(entries: DailyEntry[], dailyTokenGoal: number, referenceDate = new Date()): number {
  const tokensByDate = new Map<string, number>()
  for (const entry of entries) {
    tokensByDate.set(entry.date, (tokensByDate.get(entry.date) ?? 0) + entry.totalTokens)
  }

  let streak = 0
  let cursor = new Date(referenceDate)
  cursor.setHours(0, 0, 0, 0)

  while ((tokensByDate.get(localDateKey(cursor)) ?? 0) >= dailyTokenGoal) {
    streak += 1
    cursor = new Date(cursor.getTime() - DAY_MS)
  }

  return streak
}

export function computeStreakAtDate(entries: DailyEntry[], dailyTokenGoal: number, date: string): number {
  return computeCurrentStreak(entries, dailyTokenGoal, dateFromKey(date))
}

export function computeWeekStats(entries: DailyEntry[], effectiveThreshold: number, referenceDate = new Date()): WeekStats {
  const tokensByDate = new Map<string, number>()
  for (const entry of entries) {
    tokensByDate.set(entry.date, (tokensByDate.get(entry.date) ?? 0) + entry.totalTokens)
  }

  let effectiveDays = 0
  let totalTokens = 0
  const today = new Date(referenceDate)
  today.setHours(0, 0, 0, 0)

  for (let i = 0; i < 7; i += 1) {
    const date = localDateKey(new Date(today.getTime() - i * DAY_MS))
    const tokens = tokensByDate.get(date) ?? 0
    totalTokens += tokens
    if (tokens >= effectiveThreshold) effectiveDays += 1
  }

  return { effectiveDays, totalTokens }
}

export function computeRingMetricsForDate(
  entries: DailyEntry[],
  settings: CoachSettings,
  date = localDateKey(new Date()),
): RingMetrics {
  const aggregated = aggregateDailyEntries(entries)
  const day = aggregated.get(date)
  const totalTokens = day?.totalTokens ?? 0
  const totalCost = day?.totalCost ?? 0
  const referenceDate = dateFromKey(date)
  const weekStats = computeWeekStats(entries, settings.effectiveThreshold, referenceDate)
  const streak = computeCurrentStreak(entries, settings.dailyTokenGoal, referenceDate)
  const consistencyProgress = Math.round((weekStats.effectiveDays / 7) * 100)
  const streakBonus = Math.min(1, streak / 3) * 10
  const deepWorkScore = Math.min(
    100,
    Math.round(
      (Math.min(1, totalTokens / settings.deepWorkThreshold) * 70)
      + ((weekStats.effectiveDays / 7) * 20)
      + streakBonus,
    ),
  )

  return {
    date,
    label: shortDateLabel(date),
    totalTokens,
    totalCost,
    volumeProgress: getGoalProgress(totalTokens, settings.dailyTokenGoal),
    deepWorkScore,
    consistencyProgress,
    effectiveDaysLast7: weekStats.effectiveDays,
    streak,
    level: getUsageLevel(totalTokens, settings),
  }
}

export function computeRecentRingHistory(
  entries: DailyEntry[],
  settings: CoachSettings,
  days = 14,
  referenceDate = new Date(),
): RingMetrics[] {
  const today = new Date(referenceDate)
  today.setHours(0, 0, 0, 0)

  return Array.from({ length: days }, (_, index) => {
    const date = localDateKey(addDays(today, index - days + 1))
    return computeRingMetricsForDate(entries, settings, date)
  })
}
