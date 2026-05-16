import { useState } from "react"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { formatTokens, formatCost } from "@/lib/format"

interface ChartDataPoint {
  label: string
  totalTokens: number
  totalCost: number
}

interface TrendChartProps {
  data: ChartDataPoint[]
  loading: boolean
}

export function TrendChart({ data, loading }: TrendChartProps) {
  const [metric, setMetric] = useState<"tokens" | "cost">("tokens")

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base font-semibold">Trend</CardTitle>
        <div className="flex gap-1">
          <Button
            variant={metric === "tokens" ? "default" : "outline"}
            size="sm"
            onClick={() => setMetric("tokens")}
          >
            Tokens
          </Button>
          <Button
            variant={metric === "cost" ? "default" : "outline"}
            size="sm"
            onClick={() => setMetric("cost")}
          >
            Cost
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 12 }}
              className="text-muted-foreground"
            />
            <YAxis
              tick={{ fontSize: 12 }}
              tickFormatter={
                metric === "tokens"
                  ? (v: number) => formatTokens(v)
                  : (v: number) => `$${v.toFixed(0)}`
              }
              className="text-muted-foreground"
            />
            <Tooltip
              formatter={
                metric === "tokens"
                  ? (value: number) => [formatTokens(value), "Tokens"]
                  : (value: number) => [formatCost(value), "Cost"]
              }
              contentStyle={{
                backgroundColor: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
              }}
            />
            <Area
              type="monotone"
              dataKey={metric === "tokens" ? "totalTokens" : "totalCost"}
              stroke="hsl(var(--chart-1))"
              fill="hsl(var(--chart-1))"
              fillOpacity={0.2}
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
