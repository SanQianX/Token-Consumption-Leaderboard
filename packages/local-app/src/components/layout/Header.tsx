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
  return (
    <header className="border-b border-border px-6 py-4">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
        <h1 className="text-xl font-semibold tracking-tight">
          Token Consumption Dashboard
        </h1>
        <div className="flex items-center gap-3">
          {updatedAt && (
            <span className="text-xs text-muted-foreground">
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
            Refresh
          </Button>
          <Tabs value={mode} onValueChange={(v) => onModeChange(v as ViewMode)}>
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
      {mode === "custom" && (
        <div className="mx-auto mt-3 flex max-w-7xl items-center gap-3">
          <label className="text-sm text-muted-foreground">From:</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => onStartDateChange(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <label className="text-sm text-muted-foreground">To:</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => onEndDateChange(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      )}
    </header>
  )
}
