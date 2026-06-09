import { useEffect, useMemo, useRef, useState } from "react"
import {
  ChevronDown,
  CircleDot,
  Lightbulb,
  Zap,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import type { DailyEntry } from "@/lib/types"
import { formatCost, formatTokens } from "@/lib/format"
import { TokenRings } from "@/components/dashboard/TokenRings"
import {
  COACH_SETTINGS_STORAGE_KEY,
  DEFAULT_COACH_SETTINGS,
  computeRecentRingHistory,
  computeRingMetricsForDate,
  getCoachSuggestion,
  localDateKey,
  normalizeCoachSettings,
  parseStoredCoachSettings,
  type CoachSettings,
  type RingMetrics,
} from "@/lib/coach"

interface UsageCoachCardProps {
  entries: DailyEntry[]
  loading: boolean
}

const RING_LEGEND = [
  { label: "Volume", value: "volumeProgress", className: "bg-[var(--ring-volume)]" },
  { label: "Deep Work", value: "deepWorkScore", className: "bg-[var(--ring-deep-work)]" },
  { label: "Consistency", value: "consistencyProgress", className: "bg-[var(--ring-consistency)]" },
] as const

function readInitialSettings(): CoachSettings {
  if (typeof window === "undefined") return DEFAULT_COACH_SETTINGS
  return parseStoredCoachSettings(window.localStorage.getItem(COACH_SETTINGS_STORAGE_KEY))
}

function StatRow({
  label,
  value,
  detail,
}: {
  label: string
  value: string
  detail?: string
}) {
  return (
    <div className="flex flex-col gap-1 border-b border-border/70 py-2.5 last:border-b-0 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
      <div className="min-w-0">
        <div className="text-sm text-muted-foreground">{label}</div>
        {detail && <div className="mt-0.5 truncate text-xs text-muted-foreground/80">{detail}</div>}
      </div>
      <div className="text-xl font-semibold tracking-tight">{value}</div>
    </div>
  )
}

function RingHistory({
  history,
  selectedDate,
  onSelect,
}: {
  history: RingMetrics[]
  selectedDate: string
  onSelect: (date: string) => void
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-medium">History</div>
        <div className="text-xs text-muted-foreground">Last {history.length} days</div>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {history.map((day) => (
          <div key={day.date} className="w-16 shrink-0 text-center">
            <TokenRings
              metrics={day}
              size={52}
              strokeWidth={5}
              interactive
              selected={day.date === selectedDate}
              label={`${day.label}: ${formatTokens(day.totalTokens)}`}
              onClick={() => onSelect(day.date)}
            />
            <div className="mt-1 truncate text-[0.7rem] text-muted-foreground">{day.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function UsageCoachCard({ entries, loading }: UsageCoachCardProps) {
  const [settings, setSettings] = useState<CoachSettings>(readInitialSettings)
  const [selectedDate, setSelectedDate] = useState(localDateKey(new Date()))
  const historyRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    window.localStorage.setItem(COACH_SETTINGS_STORAGE_KEY, JSON.stringify(settings))
  }, [settings])

  const history = useMemo(
    () => computeRecentRingHistory(entries, settings, 14),
    [entries, settings],
  )

  const today = useMemo(
    () => computeRingMetricsForDate(entries, settings),
    [entries, settings],
  )

  const selected = useMemo(
    () => computeRingMetricsForDate(entries, settings, selectedDate),
    [entries, selectedDate, settings],
  )

  const updateSetting = (key: keyof CoachSettings, value: string) => {
    setSettings((current) => normalizeCoachSettings({ ...current, [key]: Number(value) }))
  }

  const showTodayHistory = () => {
    setSelectedDate(today.date)
    historyRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  if (loading) {
    return (
      <Card size="sm" className="bg-card/90">
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-80 w-full" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card size="sm" className="bg-card/90">
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div className="min-w-0">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Zap className="h-4 w-4 shrink-0 text-[var(--brand-accent)]" />
            AI Leverage
          </CardTitle>
        </div>
        <span className="shrink-0 rounded-lg border border-border bg-background px-2.5 py-1 text-xs font-medium">
          {today.level.label}
        </span>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="grid items-start gap-5 xl:grid-cols-[18rem_minmax(0,1fr)]">
          <div className="flex w-full min-w-0 flex-col items-center">
            <div className="relative">
              <TokenRings
                metrics={today}
                size={212}
                strokeWidth={10}
                interactive
                label="Open today ring history"
                onClick={showTodayHistory}
              />
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                <div className="text-3xl font-semibold tracking-tight">{formatTokens(today.totalTokens)}</div>
                <div className="mt-1 text-xs text-muted-foreground">{today.deepWorkScore}% Deep Work</div>
              </div>
            </div>
            <div className="mt-4 grid w-full grid-cols-3 gap-2">
              {RING_LEGEND.map((item) => (
                <div key={item.label} className="rounded-lg bg-background/70 p-2 text-center">
                  <div className="mx-auto mb-1 h-1.5 w-7 rounded-full">
                    <div className={`h-full rounded-full ${item.className}`} />
                  </div>
                  <div className="text-[0.7rem] text-muted-foreground">{item.label}</div>
                  <div className="text-sm font-semibold">{today[item.value]}%</div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid min-w-0 content-start gap-3">
            <div className="rounded-lg border border-border bg-background px-4">
              <StatRow label="Today Tokens" value={formatTokens(today.totalTokens)} detail={`${today.volumeProgress}% of goal`} />
              <StatRow label="Deep Work" value={`${today.deepWorkScore}%`} detail={`${formatTokens(settings.deepWorkThreshold)} target`} />
              <StatRow label="Streak" value={`${today.streak} days`} detail="Daily goal streak" />
              <StatRow label="Consistency" value={`${today.effectiveDaysLast7}/7`} detail="Effective days" />
            </div>

            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_20rem]">
              <div className="rounded-lg border border-border bg-muted/25 p-3">
                <div className="mb-1.5 flex items-center gap-2 text-sm font-medium">
                  <Lightbulb className="h-4 w-4 text-[var(--brand-accent)]" />
                  Suggested action
                </div>
                <p className="truncate text-sm text-muted-foreground">{getCoachSuggestion(today.level.id)}</p>
              </div>

              <div className="rounded-lg border border-border bg-background p-3">
                <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                  <CircleDot className="h-4 w-4 text-muted-foreground" />
                  {selected.date === today.date ? "Today detail" : selected.label}
                </div>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <div className="text-xs text-muted-foreground">Tokens</div>
                    <div className="font-semibold">{formatTokens(selected.totalTokens)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Cost</div>
                    <div className="font-semibold">{formatCost(selected.totalCost)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Level</div>
                    <div className="truncate font-semibold">{selected.level.label}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div ref={historyRef}>
          <RingHistory history={history} selectedDate={selectedDate} onSelect={setSelectedDate} />
        </div>

        <details className="group rounded-lg border border-border bg-background px-3 py-2">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium">
            Thresholds
            <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
          </summary>
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
            <label className="grid gap-1 text-xs font-medium text-muted-foreground">
              Daily goal
              <input
                type="number"
                min={1}
                step={1000}
                value={settings.dailyTokenGoal}
                onChange={(event) => updateSetting("dailyTokenGoal", event.target.value)}
                className="h-8 rounded-md border border-input bg-background px-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
              />
            </label>
            <label className="grid gap-1 text-xs font-medium text-muted-foreground">
              Effective
              <input
                type="number"
                min={1}
                step={1000}
                value={settings.effectiveThreshold}
                onChange={(event) => updateSetting("effectiveThreshold", event.target.value)}
                className="h-8 rounded-md border border-input bg-background px-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
              />
            </label>
            <label className="grid gap-1 text-xs font-medium text-muted-foreground">
              Deep work
              <input
                type="number"
                min={1}
                step={1000}
                value={settings.deepWorkThreshold}
                onChange={(event) => updateSetting("deepWorkThreshold", event.target.value)}
                className="h-8 rounded-md border border-input bg-background px-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
              />
            </label>
          </div>
        </details>
      </CardContent>
    </Card>
  )
}
