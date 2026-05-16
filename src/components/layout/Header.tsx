import type { ViewMode } from "@/lib/types"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"

const TABS: { value: ViewMode; label: string }[] = [
  { value: "daily", label: "Daily" },
  { value: "monthly", label: "Monthly" },
  { value: "session", label: "Session" },
  { value: "blocks", label: "Blocks" },
]

interface HeaderProps {
  mode: ViewMode
  onModeChange: (mode: ViewMode) => void
  onRefresh: () => void
  refreshing: boolean
  updatedAt: string | null
}

export function Header({ mode, onModeChange, onRefresh, refreshing, updatedAt }: HeaderProps) {
  return (
    <header className="border-b border-border px-6 py-4">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
        <h1 className="text-xl font-semibold tracking-tight">
          Token Consumption Leaderboard
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
    </header>
  )
}
