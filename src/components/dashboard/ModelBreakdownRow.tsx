import type { ModelBreakdown } from "@/lib/types"
import { formatTokens, formatCost } from "@/lib/format"

interface ModelBreakdownRowProps {
  breakdowns: ModelBreakdown[]
  colSpan: number
}

export function ModelBreakdownRow({ breakdowns, colSpan }: ModelBreakdownRowProps) {
  if (breakdowns.length === 0) return null

  return (
    <tr className="bg-muted/50">
      <td colSpan={colSpan} className="px-8 py-3">
        <div className="text-sm">
          <div className="mb-2 font-medium text-muted-foreground">
            Model Breakdown
          </div>
          <table className="w-full text-left">
            <thead>
              <tr className="text-xs text-muted-foreground">
                <th className="pb-1 font-medium">Model</th>
                <th className="pb-1 text-right font-medium">Input</th>
                <th className="pb-1 text-right font-medium">Output</th>
                <th className="pb-1 text-right font-medium">Cache Create</th>
                <th className="pb-1 text-right font-medium">Cache Read</th>
                <th className="pb-1 text-right font-medium">Cost</th>
              </tr>
            </thead>
            <tbody>
              {breakdowns.map((b) => (
                <tr key={b.modelName} className="border-t border-border/50">
                  <td className="py-1.5 font-mono text-xs">{b.modelName}</td>
                  <td className="py-1.5 text-right">{formatTokens(b.inputTokens)}</td>
                  <td className="py-1.5 text-right">{formatTokens(b.outputTokens)}</td>
                  <td className="py-1.5 text-right">{formatTokens(b.cacheCreationTokens)}</td>
                  <td className="py-1.5 text-right">{formatTokens(b.cacheReadTokens)}</td>
                  <td className="py-1.5 text-right">{formatCost(b.cost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </td>
    </tr>
  )
}
