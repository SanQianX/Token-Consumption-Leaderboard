import { useState, useEffect } from "react"
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

function localDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

function localToday(): string {
  return localDate(new Date())
}

function localFirstDayOfMonth(): string {
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
  const [startDate, setStartDate] = useState(localFirstDayOfMonth())
  const [endDate, setEndDate] = useState(localToday())

  useEffect(() => {
    let cancelled = false

    async function load(m: ViewMode) {
      setLoading(true)
      setError(null)

      let since: string | undefined
      let until: string | undefined

      if (m === "custom") {
        since = startDate
        until = endDate
      }

      try {
        const result = await fetchData(m, since, until)
        if (cancelled) return

        if (result.data) {
          setData(result.data)
        }
        setUpdatedAt(result.updatedAt)
        setLoading(false)
      } catch (err) {
        if (cancelled) return
        setError((err as Error).message)
        setLoading(false)
      }
    }

    load(mode)
    return () => { cancelled = true }
  }, [mode, startDate, endDate])

  const handleRefresh = async () => {
    setRefreshing(true)
    setError(null)

    let since: string | undefined
    let until: string | undefined

    if (mode === "custom") {
      since = startDate
      until = endDate
    }

    try {
      const result = await fetchData(mode, since, until)
      if (result.data) {
        setData(result.data)
      }
      setUpdatedAt(result.updatedAt)
      setRefreshing(false)
    } catch (err) {
      setError((err as Error).message)
      setRefreshing(false)
    }
  }

  return (
    <DashboardView
      mode={mode}
      data={data}
      loading={loading}
      refreshing={refreshing}
      error={error}
      updatedAt={updatedAt}
      onModeChange={(m) => {
        setMode(m)
        setData(null)
        setError(null)
        setUpdatedAt(null)
      }}
      onRefresh={handleRefresh}
      startDate={startDate}
      endDate={endDate}
      onStartDateChange={setStartDate}
      onEndDateChange={setEndDate}
    />
  )
}
