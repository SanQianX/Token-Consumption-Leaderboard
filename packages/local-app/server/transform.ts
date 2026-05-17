export function transformDailyData(raw: Record<string, unknown>) {
  if (!raw || !Array.isArray(raw.daily)) return raw
  return {
    ...raw,
    daily: raw.daily.map((entry: Record<string, unknown>) => ({
      ...entry,
      date: entry.period ?? entry.date,
    })),
  }
}

export function transformMonthlyData(raw: Record<string, unknown>) {
  if (!raw || !Array.isArray(raw.monthly)) return raw
  return {
    ...raw,
    monthly: raw.monthly.map((entry: Record<string, unknown>) => ({
      ...entry,
      month: entry.period ?? entry.month,
    })),
  }
}

export function transformForCommand(command: string, data: unknown): unknown {
  if (!data || typeof data !== "object") return data
  if (command === "daily") return transformDailyData(data as Record<string, unknown>)
  if (command === "monthly") return transformMonthlyData(data as Record<string, unknown>)
  return data
}
