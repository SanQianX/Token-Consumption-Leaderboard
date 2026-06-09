import { useEffect, useState } from "react"
import type { ViewMode } from "@/lib/types"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"

const TABS: { value: ViewMode; label: string }[] = [
  { value: "daily", label: "Daily" },
  { value: "monthly", label: "Monthly" },
  { value: "custom", label: "Custom Range" },
  { value: "alltime", label: "All Time" },
]

interface HeaderProps {
  mode: ViewMode
  onModeChange: (mode: ViewMode) => void
  onRefresh: () => void
  refreshing: boolean
  updatedAt: string | null
  startDate: string
  endDate: string
  onStartDateChange: (date: string) => void
  onEndDateChange: (date: string) => void
}

export function Header({
  mode,
  onModeChange,
  onRefresh,
  refreshing,
  updatedAt,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
}: HeaderProps) {
  const [draftStartDate, setDraftStartDate] = useState(startDate)
  const [draftEndDate, setDraftEndDate] = useState(endDate)

  useEffect(() => {
    setDraftStartDate(startDate)
    setDraftEndDate(endDate)
  }, [startDate, endDate])

  const canApplyRange = Boolean(draftStartDate && draftEndDate && draftStartDate <= draftEndDate)

  const applyRange = () => {
    if (!canApplyRange) return
    onStartDateChange(draftStartDate)
    onEndDateChange(draftEndDate)
  }

  return (
    <header className="border-b border-border px-4 py-3 sm:px-6">
      <div className="mx-auto flex max-w-7xl flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
        <h1 className="text-lg font-semibold tracking-tight sm:text-xl">
          Today
        </h1>
        <div className="flex w-full min-w-0 flex-wrap items-center gap-2 lg:w-auto lg:justify-end">
          {updatedAt && (
            <span className="hidden text-xs text-muted-foreground sm:inline">
              Updated: {new Date(updatedAt).toLocaleTimeString()}
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={refreshing}
            className="gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
          <div className="min-w-0 flex-1 overflow-x-auto pb-1 sm:flex-none sm:pb-0">
            <Tabs
              value={mode}
              onValueChange={(v) => onModeChange(v as ViewMode)}
              className="min-w-max"
            >
              <TabsList>
                {TABS.map((tab) => (
                  <TabsTrigger key={tab.value} value={tab.value}>
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
        </div>
      </div>
      {mode === "custom" && (
        <div className="mx-auto mt-3 flex max-w-7xl flex-wrap items-center gap-3">
          <label className="text-sm text-muted-foreground">From:</label>
          <input
            type="date"
            value={draftStartDate}
            onChange={(e) => setDraftStartDate(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <label className="text-sm text-muted-foreground">To:</label>
          <input
            type="date"
            value={draftEndDate}
            onChange={(e) => setDraftEndDate(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={applyRange}
            disabled={!canApplyRange}
          >
            Apply
          </Button>
        </div>
      )}
    </header>
  )
}
