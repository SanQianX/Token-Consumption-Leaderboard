import { useState, useEffect, useCallback } from "react"
import { Header } from "@/components/layout/Header"
import { KpiCards } from "@/components/dashboard/KpiCards"
import { TrendChart } from "@/components/dashboard/TrendChart"
import { DataTable } from "@/components/dashboard/DataTable"
import { fetchData } from "@/lib/api"
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

function App() {
  const [mode, setMode] = useState<ViewMode>("daily")
  const [data, setData] = useState<ViewData>(null)
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [updatedAt, setUpdatedAt] = useState<string | null>(null)

  const load = useCallback(async (m: ViewMode, isManualRefresh = false) => {
    if (!isManualRefresh) {
      setLoading(true)
    } else {
      setRefreshing(true)
    }
    setError(null)

    try {
      const result = await fetchData(m)

      if (result.data) {
        setData(result.data)
      }

      setUpdatedAt(result.updatedAt)
      setLoading(false)
      setRefreshing(false)
    } catch (err) {
      setError((err as Error).message)
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    load(mode)
  }, [mode])

  const handleModeChange = (m: ViewMode) => {
    setMode(m)
    setData(null)
    setError(null)
    setUpdatedAt(null)
  }

  const handleRefresh = () => {
    load(mode, true)
  }

  const totals = getTotals(mode, data)
  const chartData = getChartData(mode, data)
  const tableData = getTableData(mode, data)

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header
        mode={mode}
        onModeChange={handleModeChange}
        onRefresh={handleRefresh}
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
    </div>
  )
}

export default App
