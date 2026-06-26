export type ViewMode = "daily" | "monthly" | "custom" | "alltime"

export interface ModelBreakdown {
  modelName: string
  inputTokens: number
  outputTokens: number
  cacheCreationTokens: number
  cacheReadTokens: number
  cost: number
}

export interface Totals {
  inputTokens: number
  outputTokens: number
  cacheCreationTokens: number
  cacheReadTokens: number
  totalTokens: number
  totalCost: number
}

export interface DailyEntry {
  date: string
  inputTokens: number
  outputTokens: number
  cacheCreationTokens: number
  cacheReadTokens: number
  totalTokens: number
  totalCost: number
  modelsUsed: string[]
  modelBreakdowns: ModelBreakdown[]
  project?: string
}

export interface DailyResponse {
  daily: DailyEntry[]
  totals: Totals
}

export interface MonthlyEntry {
  month: string
  inputTokens: number
  outputTokens: number
  cacheCreationTokens: number
  cacheReadTokens: number
  totalTokens: number
  totalCost: number
  modelsUsed: string[]
  modelBreakdowns: ModelBreakdown[]
  project?: string
}

export interface MonthlyResponse {
  monthly: MonthlyEntry[]
  totals: Totals
}

export interface SessionEntry {
  sessionId: string
  inputTokens: number
  outputTokens: number
  cacheCreationTokens: number
  cacheReadTokens: number
  totalTokens: number
  totalCost: number
  lastActivity: string
  modelsUsed: string[]
  modelBreakdowns: ModelBreakdown[]
  projectPath: string
}

export interface SessionResponse {
  sessions: SessionEntry[]
  totals: Totals
}

export interface BurnRate {
  tokensPerMinute: number
  tokensPerMinuteForIndicator: number
  costPerHour: number
}

export interface Projection {
  totalTokens: number
  totalCost: number
  remainingMinutes: number
}

export interface TokenLimitStatus {
  limit: number
  projectedUsage: number
  percentUsed: number
  status: "exceeds" | "warning" | "ok"
}

export interface BlockEntry {
  id: string
  startTime: string
  endTime: string
  actualEndTime: string | null
  isActive: boolean
  isGap: boolean
  entries: number
  tokenCounts: {
    inputTokens: number
    outputTokens: number
    cacheCreationInputTokens: number
    cacheReadInputTokens: number
  }
  totalTokens: number
  costUSD: number
  models: string[]
  burnRate: BurnRate | null
  projection: Projection | null
  tokenLimitStatus?: TokenLimitStatus
}

export interface BlocksResponse {
  blocks: BlockEntry[]
}

export interface CachedEnvelope<T> {
  data: T
  updatedAt: string
  stale?: boolean
  refreshing?: boolean
}

export type ApiResponse =
  | { mode: "daily"; data: DailyResponse }
  | { mode: "monthly"; data: MonthlyResponse }
  | { mode: "custom"; data: DailyResponse }
  | { mode: "alltime"; data: DailyResponse }

export interface LiveDelta {
  ts: number
  model: string
  sessionId: string
  inputTokens: number
  outputTokens: number
  cacheCreationTokens: number
  cacheReadTokens: number
}

export interface LiveTodayTotals {
  date: string
  inputTokens: number
  outputTokens: number
  cacheCreationTokens: number
  cacheReadTokens: number
  totalTokens: number
}

export interface LiveSnapshot {
  today: LiveTodayTotals
  recent: LiveDelta[]
  startedAt: number
  baselineAt: number
  baselineSource: "scan" | "cache"
}

export type LiveEvent =
  | ({ type: "snapshot" } & LiveSnapshot)
  | ({ type: "delta" } & LiveSnapshot)
