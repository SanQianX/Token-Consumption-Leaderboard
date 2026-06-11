import { useMemo } from "react"
import { Header } from "@/components/layout/Header"
import { KpiCards } from "@/components/dashboard/KpiCards"
import { TrendChart } from "@/components/dashboard/TrendChart"
import { DataTable } from "@/components/dashboard/DataTable"
import { UsageCoachCard } from "@/components/dashboard/UsageCoachCard"
import type {
  ViewMode,
  DailyResponse,
  MonthlyResponse,
  DailyEntry,
  MonthlyEntry,
  Totals,
} from "@/lib/types"
import { formatDate } from "@/lib/format"

type ViewData =
  | DailyResponse
  | MonthlyResponse
  | null

interface DashboardViewProps {
  mode: ViewMode
  data: ViewData
  loading: boolean
  refreshing: boolean
  error: string | null
  updatedAt: string | null
  onModeChange: (mode: ViewMode) => void
  onRefresh: () => void
  startDate: string
  endDate: string
  onStartDateChange: (date: string) => void
  onEndDateChange: (date: string) => void
}

function today(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

function firstDayOfMonth(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`
}

function computeTotals(entries: { inputTokens: number; outputTokens: number; cacheCreationTokens: number; cacheReadTokens: number; totalTokens: number; totalCost: number }[]): Totals {
  return {
    inputTokens: entries.reduce((s, e) => s + e.inputTokens, 0),
    outputTokens: entries.reduce((s, e) => s + e.outputTokens, 0),
    cacheCreationTokens: entries.reduce((s, e) => s + e.cacheCreationTokens, 0),
    cacheReadTokens: entries.reduce((s, e) => s + e.cacheReadTokens, 0),
    totalTokens: entries.reduce((s, e) => s + e.totalTokens, 0),
    totalCost: entries.reduce((s, e) => s + e.totalCost, 0),
  }
}

function filterDailyByRange(entries: DailyEntry[], since: string, until: string): DailyEntry[] {
  return entries.filter((e) => {
    const d = e.date
    if (d < since) return false
    if (d > until) return false
    return true
  })
}

function filterMonthlyByRange(entries: MonthlyEntry[], since: string, until: string): MonthlyEntry[] {
  return entries.filter((e) => {
    const m = e.month
    if (m < since.slice(0, 7)) return false
    if (m > until.slice(0, 7)) return false
    return true
  })
}

export function DashboardView({
  mode,
  data,
  loading,
  refreshing,
  error,
  updatedAt,
  onModeChange,
  onRefresh,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
}: DashboardViewProps) {
  const { chartData, kpiTotals, tableData, coachEntries } = useMemo(() => {
    if (!data) return { chartData: [], kpiTotals: null, tableData: [], coachEntries: [] }

    if (mode === "daily") {
      const entries = "daily" in data ? data.daily : []
      const todayStr = today()
      const todayEntries = filterDailyByRange(entries, todayStr, todayStr)
      return {
        chartData: entries.map((d) => ({ label: formatDate(d.date), totalTokens: d.totalTokens, totalCost: d.totalCost })),
        kpiTotals: computeTotals(todayEntries),
        tableData: entries.map((d) => ({ ...d, _type: "daily" as const })),
        coachEntries: entries,
      }
    }

    if (mode === "monthly") {
      const entries = "monthly" in data ? data.monthly : []
      const since = firstDayOfMonth()
      const todayStr = today()
      const monthEntries = filterMonthlyByRange(entries, since, todayStr)
      return {
        chartData: entries.map((m) => ({ label: m.month, totalTokens: m.totalTokens, totalCost: m.totalCost })),
        kpiTotals: computeTotals(monthEntries),
        tableData: entries.map((m) => ({ ...m, _type: "monthly" as const })),
        coachEntries: [],
      }
    }

    if (mode === "alltime") {
      const entries = "daily" in data ? data.daily : []
      return {
        chartData: entries.map((d) => ({ label: formatDate(d.date), totalTokens: d.totalTokens, totalCost: d.totalCost })),
        kpiTotals: "totals" in data ? data.totals : null,
        tableData: entries.map((d) => ({ ...d, _type: "daily" as const })),
        coachEntries: entries,
      }
    }

    if (mode === "custom") {
      const entries = "daily" in data ? data.daily : []
      const filtered = filterDailyByRange(entries, startDate, endDate)
      return {
        chartData: entries.map((d) => ({ label: formatDate(d.date), totalTokens: d.totalTokens, totalCost: d.totalCost })),
        kpiTotals: computeTotals(filtered),
        tableData: filtered.map((d) => ({ ...d, _type: "daily" as const })),
        coachEntries: entries,
      }
    }

    return { chartData: [], kpiTotals: null, tableData: [], coachEntries: [] }
  }, [mode, data, startDate, endDate])

  return (
    <>
      <Header
        mode={mode}
        onModeChange={onModeChange}
        onRefresh={onRefresh}
        refreshing={refreshing}
        updatedAt={updatedAt}
        startDate={startDate}
        endDate={endDate}
        onStartDateChange={onStartDateChange}
        onEndDateChange={onEndDateChange}
      />
      <main className="mx-auto max-w-7xl space-y-4 p-4 sm:p-6">
        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
            Error: {error}
          </div>
        )}
        {mode === "daily" ? (
          <section>
            <UsageCoachCard entries={coachEntries} loading={loading && !data} />
          </section>
        ) : (
          <KpiCards totals={kpiTotals} loading={loading && !data} />
        )}
        <TrendChart data={chartData} loading={loading && !data} />
        <DataTable
          mode={mode}
          data={tableData as unknown as Parameters<typeof DataTable>[0]["data"]}
          loading={loading && !data}
        />
      </main>
    </>
  )
}
