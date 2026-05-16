import { useState, useEffect, useCallback } from "react"
import { DashboardView } from "@/components/dashboard/DashboardView"
import { fetchData } from "@/lib/api"
import type {
  ViewMode,
  DailyResponse,
  MonthlyResponse,
  SessionResponse,
  BlocksResponse,
} from "@/lib/types"

type ViewData =
  | DailyResponse
  | MonthlyResponse
  | SessionResponse
  | BlocksResponse
  | null

export function HomePage() {
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
    />
  )
}
