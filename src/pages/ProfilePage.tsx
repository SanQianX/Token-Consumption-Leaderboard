import { useState, useEffect, useCallback } from "react"
import { useParams } from "react-router"
import { DashboardView } from "@/components/dashboard/DashboardView"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
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

interface UserProfile {
  username: string
  display_name: string | null
  avatar_url: string | null
  bio: string | null
}

export function ProfilePage() {
  const { username } = useParams<{ username: string }>()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [profileLoading, setProfileLoading] = useState(true)
  const [mode, setMode] = useState<ViewMode>("daily")
  const [data, setData] = useState<ViewData>(null)
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [updatedAt, setUpdatedAt] = useState<string | null>(null)

  useEffect(() => {
    if (!username) return
    setProfileLoading(true)
    fetch(`/api/profile/${username}`)
      .then((res) => {
        if (!res.ok) throw new Error(`User not found`)
        return res.json()
      })
      .then((data) => {
        setProfile(data.profile)
        setProfileLoading(false)
      })
      .catch(() => {
        setError("User not found")
        setProfileLoading(false)
      })
  }, [username])

  const load = useCallback(
    async (m: ViewMode, isManualRefresh = false) => {
      if (!username) return

      if (!isManualRefresh) {
        setLoading(true)
      } else {
        setRefreshing(true)
      }
      setError(null)

      try {
        const res = await fetch(`/api/profile/${username}?type=${m}`)
        if (!res.ok) throw new Error(`API error: ${res.status}`)

        const json = await res.json()
        setData(json.data)
        setUpdatedAt(json.updatedAt)
        setLoading(false)
        setRefreshing(false)
      } catch (err) {
        setError((err as Error).message)
        setLoading(false)
        setRefreshing(false)
      }
    },
    [username],
  )

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

  if (profileLoading) {
    return (
      <div className="mx-auto max-w-7xl space-y-6 p-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-16 w-16 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      {profile && (
        <Card className="mx-auto max-w-7xl mt-0">
          <CardContent className="flex items-center gap-4 p-6">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.display_name || profile.username}
                className="h-16 w-16 rounded-full"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted text-xl font-medium">
                {(profile.display_name || profile.username)
                  .charAt(0)
                  .toUpperCase()}
              </div>
            )}
            <div>
              <h2 className="text-xl font-bold">
                {profile.display_name || profile.username}
              </h2>
              <p className="text-sm text-muted-foreground">
                @{profile.username}
              </p>
              {profile.bio && (
                <p className="mt-1 text-sm text-muted-foreground">
                  {profile.bio}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
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
    </div>
  )
}
