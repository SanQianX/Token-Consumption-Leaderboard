import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Trophy, User } from "lucide-react"
import { formatTokens, formatCost } from "@/lib/format"
import { Link } from "react-router"
import { fetchLeaderboard } from "@/lib/remote-api"
import { useAuth } from "@/hooks/useAuth"

type LeaderboardPeriod = "1d" | "7d" | "30d" | "all_time"
type LeaderboardSort = "tokens" | "cost"

interface LeaderboardEntry {
  rank: number
  username: string
  display_name: string | null
  avatar_url: string | null
  total_tokens: number
  total_cost: number
}

const PERIODS: { value: LeaderboardPeriod; label: string }[] = [
  { value: "1d", label: "1 Day" },
  { value: "7d", label: "7 Days" },
  { value: "30d", label: "30 Days" },
  { value: "all_time", label: "All Time" },
]

export function LeaderboardPage() {
  const { user } = useAuth()
  const [period, setPeriod] = useState<LeaderboardPeriod>("all_time")
  const [sort, setSort] = useState<LeaderboardSort>("tokens")
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [myRank, setMyRank] = useState<LeaderboardEntry | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    setPage(1)
  }, [period, sort])

  useEffect(() => {
    setLoading(true)
    setError(null)

    fetchLeaderboard({ period, sort, page, limit: 50, username: user?.username })
      .then((data) => {
        setEntries(data.entries)
        setMyRank(data.myRank || null)
        setTotalPages(data.totalPages)
        setLoading(false)
      })
      .catch((err) => {
        setError((err as Error).message)
        setLoading(false)
      })
  }, [period, sort, page, user?.username])

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Trophy className="h-6 w-6 text-chart-4" />
          <h1 className="text-2xl font-bold tracking-tight">
            Token Consumption Leaderboard
          </h1>
        </div>
        <p className="text-sm text-muted-foreground">
          See how your Claude usage compares with other users worldwide.
        </p>
        {!user && (
          <div className="rounded-lg border border-border bg-muted/50 p-4">
            <p className="text-sm text-muted-foreground">
              <Link to="/settings" className="font-medium text-primary underline-offset-4 hover:underline">
                Log in
              </Link>{" "}
              to see your ranking on the leaderboard and submit your usage data.
            </p>
          </div>
        )}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="flex items-center gap-1">
            {PERIODS.map((p) => (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  period === p.value
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setSort("tokens")}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                sort === "tokens"
                  ? "bg-secondary text-secondary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              Tokens
            </button>
            <button
              onClick={() => setSort("cost")}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                sort === "cost"
                  ? "bg-secondary text-secondary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              Cost
            </button>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive mb-4">
              Error: {error}
            </div>
          )}

          <div className="rounded-md border">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground w-16">
                    Rank
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    User
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                    Tokens
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                    Cost
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 10 }).map((_, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="px-4 py-3">
                        <Skeleton className="h-5 w-8" />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Skeleton className="h-8 w-8 rounded-full" />
                          <Skeleton className="h-5 w-24" />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Skeleton className="ml-auto h-5 w-16" />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Skeleton className="ml-auto h-5 w-16" />
                      </td>
                    </tr>
                  ))
                ) : entries.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-12 text-center text-muted-foreground"
                    >
                      No data yet. Be the first to submit your usage!
                    </td>
                  </tr>
                ) : (
                  entries.map((entry) => {
                    const isMe = user && entry.username === user.username
                    return (
                      <tr
                        key={entry.username}
                        className={`border-b last:border-0 transition-colors hover:bg-muted/50 ${
                          isMe ? "bg-primary/10" : ""
                        }`}
                      >
                        <td className="px-4 py-3">
                          <span
                            className={`text-sm font-bold ${
                              entry.rank <= 3
                                ? "text-chart-4"
                                : "text-muted-foreground"
                            }`}
                          >
                            #{entry.rank}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <Link
                            to={`/profile/${entry.username}`}
                            className="flex items-center gap-3 transition-colors hover:text-primary"
                          >
                            {entry.avatar_url ? (
                              <img
                                src={entry.avatar_url}
                                alt={entry.display_name || entry.username}
                                className="h-8 w-8 rounded-full"
                              />
                            ) : (
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-medium">
                                {(entry.display_name || entry.username)
                                  .charAt(0)
                                  .toUpperCase()}
                              </div>
                            )}
                            <span className="text-sm font-medium">
                              {entry.display_name || entry.username}
                            </span>
                            {isMe && (
                              <span className="rounded bg-primary/20 px-1.5 py-0.5 text-xs font-medium text-primary">
                                You
                              </span>
                            )}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-sm">
                          {formatTokens(entry.total_tokens)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-sm">
                          {formatCost(entry.total_cost)}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <p className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium transition-colors hover:bg-accent disabled:pointer-events-none disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium transition-colors hover:bg-accent disabled:pointer-events-none disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Personal rank card */}
      {user && !loading && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="h-4 w-4" />
              Your Ranking
            </CardTitle>
          </CardHeader>
          <CardContent>
            {myRank ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-primary">#{myRank.rank}</p>
                    <p className="text-xs text-muted-foreground">Rank</p>
                  </div>
                  <div className="h-10 w-px bg-border" />
                  <div>
                    <p className="text-sm font-medium">{formatTokens(myRank.total_tokens)}</p>
                    <p className="text-xs text-muted-foreground">Tokens</p>
                  </div>
                  <div className="h-10 w-px bg-border" />
                  <div>
                    <p className="text-sm font-medium">{formatCost(myRank.total_cost)}</p>
                    <p className="text-xs text-muted-foreground">Cost</p>
                  </div>
                </div>
                <Link
                  to={`/profile/${user.username}`}
                  className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                >
                  View Profile
                </Link>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  You haven't submitted any data yet.
                </p>
                <Link
                  to="/settings"
                  className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                >
                  Go to Settings to submit
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
