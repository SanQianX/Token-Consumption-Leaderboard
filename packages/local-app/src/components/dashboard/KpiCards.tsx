import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import type { Totals } from "@/lib/types"
import { formatTokens, formatCost } from "@/lib/format"
import { Coins, ArrowDownToLine, ArrowUpFromLine, Hash } from "lucide-react"

interface KpiCardsProps {
  totals: Totals | null
  loading: boolean
  compact?: boolean
}

export function KpiCards({ totals, loading, compact = false }: KpiCardsProps) {
  const cards = [
    {
      title: "Total Tokens",
      value: totals ? formatTokens(totals.totalTokens) : "-",
      icon: Hash,
    },
    {
      title: "Total Cost",
      value: totals ? formatCost(totals.totalCost) : "-",
      icon: Coins,
    },
    {
      title: "Input Tokens",
      value: totals ? formatTokens(totals.inputTokens) : "-",
      icon: ArrowDownToLine,
    },
    {
      title: "Output Tokens",
      value: totals ? formatTokens(totals.outputTokens) : "-",
      icon: ArrowUpFromLine,
    },
  ]

  return (
    <div className={compact ? "grid grid-cols-2 gap-3" : "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"}>
      {cards.map((card) => (
        <Card key={card.title} size={compact ? "sm" : "default"}>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-1.5">
            <CardTitle className={compact ? "text-xs font-medium text-muted-foreground" : "text-sm font-medium text-muted-foreground"}>
              {card.title}
            </CardTitle>
            <card.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className={compact ? "h-7 w-20" : "h-8 w-28"} />
            ) : (
              <p className={compact ? "text-xl font-bold tracking-tight" : "text-2xl font-bold"}>{card.value}</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
