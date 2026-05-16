import { Header } from "@/components/layout/Header"
import { KpiCards } from "@/components/dashboard/KpiCards"
import { TrendChart } from "@/components/dashboard/TrendChart"
import { DataTable } from "@/components/dashboard/DataTable"
import type {
  ViewMode,
  DailyResponse,
  MonthlyResponse,
  SessionResponse,
  BlocksResponse,
  Totals,
} from "@/lib/types"
import { formatDate } from "@/lib/format"

type ViewData =
  | DailyResponse
  | MonthlyResponse
  | SessionResponse
  | BlocksResponse
  | null

function getTotals(_mode: ViewMode, data: ViewData): Totals | null {
  if (!data) return null
  if ("totals" in data) return data.totals
  return null
}

function getChartData(
  mode: ViewMode,
  data: ViewData,
): { label: string; totalTokens: number; totalCost: number }[] {
  if (!data) return []
  if (mode === "daily" && "daily" in data) {
    return data.daily.map((d) => ({
      label: formatDate(d.date),
      totalTokens: d.totalTokens,
      totalCost: d.totalCost,
    }))
  }
  if (mode === "monthly" && "monthly" in data) {
    return data.monthly.map((m) => ({
      label: m.month,
      totalTokens: m.totalTokens,
      totalCost: m.totalCost,
    }))
  }
  if (mode === "session" && "sessions" in data) {
    return data.sessions.map((s) => ({
      label: s.sessionId.slice(0, 8),
      totalTokens: s.totalTokens,
      totalCost: s.totalCost,
    }))
  }
  if (mode === "blocks" && "blocks" in data) {
    return data.blocks
      .filter((b) => !b.isGap)
      .map((b) => ({
        label: formatDate(b.startTime),
        totalTokens: b.totalTokens,
        totalCost: b.costUSD,
      }))
  }
  return []
}

function getTableData(
  mode: ViewMode,
  data: ViewData,
): (Record<string, unknown> & { _type: ViewMode })[] {
  if (!data) return []
  if (mode === "daily" && "daily" in data) {
    return data.daily.map((d) => ({ ...d, _type: "daily" as const }))
  }
  if (mode === "monthly" && "monthly" in data) {
    return data.monthly.map((m) => ({ ...m, _type: "monthly" as const }))
  }
  if (mode === "session" && "sessions" in data) {
    return data.sessions.map((s) => ({ ...s, _type: "session" as const }))
  }
  if (mode === "blocks" && "blocks" in data) {
    return data.blocks.map((b) => ({ ...b, _type: "blocks" as const }))
  }
  return []
}

interface DashboardViewProps {
  mode: ViewMode
  data: ViewData
  loading: boolean
  refreshing: boolean
  error: string | null
  updatedAt: string | null
  onModeChange: (mode: ViewMode) => void
  onRefresh: () => void
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
}: DashboardViewProps) {
  const totals = getTotals(mode, data)
  const chartData = getChartData(mode, data)
  const tableData = getTableData(mode, data)

  return (
    <>
      <Header
        mode={mode}
        onModeChange={onModeChange}
        onRefresh={onRefresh}
        refreshing={refreshing}
        updatedAt={updatedAt}
      />
      <main className="mx-auto max-w-7xl space-y-6 p-6">
        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
            Error: {error}
          </div>
        )}
        <KpiCards totals={totals} loading={loading && !data} />
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
