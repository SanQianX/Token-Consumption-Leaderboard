import { ArrowDownToLine, ArrowUpFromLine, Database, Radio } from "lucide-react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useLiveTokens } from "@/hooks/useLiveTokens"
import { useAnimatedNumber } from "@/hooks/useAnimatedNumber"
import { formatTokens } from "@/lib/format"
import type { DailyEntry, LiveDelta } from "@/lib/types"

function Pulse({ active }: { active: boolean }) {
  return (
    <span
      aria-hidden
      className={
        "relative inline-flex h-2.5 w-2.5 items-center justify-center rounded-full " +
        (active ? "bg-emerald-500" : "bg-zinc-400")
      }
    >
      {active && (
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />
      )}
    </span>
  )
}

function CounterCell({
  label,
  value,
  icon: Icon,
  tone,
  animate,
}: {
  label: string
  value: number
  icon: typeof ArrowDownToLine
  tone: string
  animate: boolean
}) {
  const animated = useAnimatedNumber(value, animate ? 320 : 0)
  return (
    <div className="flex flex-col gap-1 rounded-lg bg-muted/50 px-3 py-2">
      <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        <Icon className={"h-3.5 w-3.5 " + tone} />
        <span>{label}</span>
      </div>
      <div className="font-mono text-2xl font-bold tabular-nums leading-none">
        {formatTokens(Math.round(animated))}
      </div>
    </div>
  )
}

function formatTime(ts: number): string {
  const d = new Date(ts)
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`
}

function modelShort(model: string): string {
  if (!model) return "?"
  const parts = model.split("-")
  return parts[0] ?? model
}

function Ticker({ items }: { items: LiveDelta[] }) {
  if (items.length === 0) {
    return (
      <div className="h-8 overflow-hidden rounded-md border border-dashed border-border/60 px-3 flex items-center text-xs text-muted-foreground">
        等待新的 turn 完成…
      </div>
    )
  }

  return (
    <div className="relative h-8 overflow-hidden rounded-md border border-border/60 bg-muted/30">
      <div className="flex h-full items-center gap-3 overflow-x-auto px-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((d, i) => {
          const total =
            d.inputTokens + d.outputTokens + d.cacheCreationTokens + d.cacheReadTokens
          const isNewest = i === items.length - 1
          return (
            <span
              key={d.ts + "_" + i}
              className={
                "flex shrink-0 items-center gap-1.5 font-mono text-xs tabular-nums transition-opacity " +
                (isNewest ? "text-emerald-600 dark:text-emerald-400 font-semibold" : "text-muted-foreground")
              }
            >
              <span className="text-[10px] opacity-70">{formatTime(d.ts)}</span>
              <span className="opacity-70">{modelShort(d.model)}</span>
              <span className="opacity-90">+{formatTokens(total)}</span>
              {isNewest && <span className="text-emerald-500">●</span>}
            </span>
          )
        })}
      </div>
    </div>
  )
}

function LiveCounterSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-2.5 w-2.5 rounded-full" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-3 w-40" />
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-3">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
      </CardContent>
    </Card>
  )
}

interface LiveCounterProps {
  selectedDate: string
  dailyEntry: DailyEntry | null
  todayDate: string
}

export function LiveCounter({ selectedDate, dailyEntry, todayDate }: LiveCounterProps) {
  const isLive = selectedDate === todayDate
  const { snapshot, connected } = useLiveTokens({ enabled: isLive })

  // Historical mode: show static totals from the daily entry. No SSE, no
  // ticker, no count-up animation — the user is browsing a past day.
  if (!isLive) {
    const cacheTotal =
      (dailyEntry?.cacheCreationTokens ?? 0) + (dailyEntry?.cacheReadTokens ?? 0)
    return (
      <Card data-testid="live-counter">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div className="flex items-center gap-2">
            <Pulse active={false} />
            <Radio className="h-4 w-4 text-zinc-400" />
            <CardTitle className="text-sm font-medium">
              HISTORY · {selectedDate}
            </CardTitle>
          </div>
          <span className="text-xs text-muted-foreground">
            历史数据 · 非实时
          </span>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            <CounterCell
              label="Input"
              value={dailyEntry?.inputTokens ?? 0}
              icon={ArrowDownToLine}
              tone="text-sky-500"
              animate={false}
            />
            <CounterCell
              label="Output"
              value={dailyEntry?.outputTokens ?? 0}
              icon={ArrowUpFromLine}
              tone="text-violet-500"
              animate={false}
            />
            <CounterCell
              label="Cache"
              value={cacheTotal}
              icon={Database}
              tone="text-emerald-500"
              animate={false}
            />
          </div>
        </CardContent>
      </Card>
    )
  }

  // Live mode (today): SSE-driven, ticker, count-up animation.
  if (!snapshot) return <LiveCounterSkeleton />

  const cacheTotal = snapshot.today.cacheCreationTokens + snapshot.today.cacheReadTokens

  return (
    <Card data-testid="live-counter">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          <Pulse active={connected} />
          <Radio className="h-4 w-4 text-emerald-600" />
          <CardTitle className="text-sm font-medium">
            LIVE · {snapshot.today.date}
          </CardTitle>
        </div>
        <span className="text-xs text-muted-foreground">
          {snapshot.baselineSource === "cache"
            ? "今日 baseline 来自 ccusage 缓存"
            : "启动时回扫了今日 JSONL"}
          {" · "}
          {connected ? "已连接" : "重连中…"}
        </span>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-3 gap-3">
          <CounterCell
            label="Input"
            value={snapshot.today.inputTokens}
            icon={ArrowDownToLine}
            tone="text-sky-500"
            animate={true}
          />
          <CounterCell
            label="Output"
            value={snapshot.today.outputTokens}
            icon={ArrowUpFromLine}
            tone="text-violet-500"
            animate={true}
          />
          <CounterCell
            label="Cache"
            value={cacheTotal}
            icon={Database}
            tone="text-emerald-500"
            animate={true}
          />
        </div>
        <Ticker items={snapshot.recent} />
      </CardContent>
    </Card>
  )
}