import { useState, useEffect, useCallback } from "react"
import { DashboardView } from "@/components/dashboard/DashboardView"
import { fetchData } from "@/lib/api"
import type {
  ViewMode,
  DailyResponse,
  MonthlyResponse,
} from "@/lib/types"

type ViewData =
  | DailyResponse
  | MonthlyResponse
  | null

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

function firstDayOfMonth(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`
}

export function HomePage() {
  const [mode, setMode] = useState<ViewMode>("daily")
  const [data, setData] = useState<ViewData>(null)
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [updatedAt, setUpdatedAt] = useState<string | null>(null)
  const [startDate, setStartDate] = useState(firstDayOfMonth())
  const [endDate, setEndDate] = useState(today())

  const load = useCallback(async (m: ViewMode, isManualRefresh = false) => {
    if (!isManualRefresh) {
      setLoading(true)
    } else {
      setRefreshing(true)
    }
    setError(null)

    try {
      let since: string | undefined
      let until: string | undefined

      if (m === "daily") {
        since = firstDayOfMonth()
        until = today()
      } else if (m === "custom") {
        since = startDate
        until = endDate
      }

      const result = await fetchData(m, since, until)

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
  }, [startDate, endDate])

  useEffect(() => {
    load(mode)
  }, [mode, load])

  const handleModeChange = (m: ViewMode) => {
    setMode(m)
    setData(null)
    setError(null)
    setUpdatedAt(null)
  }

  const handleRefresh = () => {
    load(mode, true)
  }

  return (
    <DashboardView
      mode={mode}
      data={data}
      loading={loading}
      refreshing={refreshing}
      error={error}
      updatedAt={updatedAt}
      onModeChange={handleModeChange}
      onRefresh={handleRefresh}
      startDate={startDate}
      endDate={endDate}
      onStartDateChange={setStartDate}
      onEndDateChange={setEndDate}
    />
  )
}
