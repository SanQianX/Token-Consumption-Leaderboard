import { Header } from "@/components/layout/Header"
import { KpiCards } from "@/components/dashboard/KpiCards"
import { TrendChart } from "@/components/dashboard/TrendChart"
import { DataTable } from "@/components/dashboard/DataTable"
import type {
  ViewMode,
  DailyResponse,
  MonthlyResponse,
  Totals,
} from "@/lib/types"
import { formatDate } from "@/lib/format"

type ViewData =
  | DailyResponse
  | MonthlyResponse
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
  if ((mode === "daily" || mode === "custom" || mode === "alltime") && "daily" in data) {
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
  return []
}

function getTableData(
  mode: ViewMode,
  data: ViewData,
): (Record<string, unknown> & { _type: ViewMode })[] {
  if (!data) return []
  if ((mode === "daily" || mode === "custom" || mode === "alltime") && "daily" in data) {
    return data.daily.map((d) => ({ ...d, _type: "daily" as const }))
  }
  if (mode === "monthly" && "monthly" in data) {
    return data.monthly.map((m) => ({ ...m, _type: "monthly" as const }))
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
  startDate: string
  endDate: string
  onStartDateChange: (date: string) => void
  onEndDateChange: (date: string) => void
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
        startDate={startDate}
        endDate={endDate}
        onStartDateChange={onStartDateChange}
        onEndDateChange={onEndDateChange}
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
