import type {
  DailyResponse,
  MonthlyResponse,
  ViewMode,
  CachedEnvelope,
} from "./types"

type ResponseMap = {
  daily: DailyResponse
  monthly: MonthlyResponse
  custom: DailyResponse
  alltime: DailyResponse
}

export interface FetchResult<T> {
  data: T | null
  loading: boolean
  stale: boolean
  updatedAt: string | null
}

export async function fetchData<M extends ViewMode>(
  mode: M,
  since?: string,
  until?: string,
): Promise<FetchResult<ResponseMap[M]>> {
  let url = `/api/${mode === "custom" || mode === "alltime" ? "daily" : mode}`
  const params = new URLSearchParams()
  if (since) params.set("since", since)
  if (until) params.set("until", until)
  if (params.toString()) url += `?${params}`

  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`)
  }

  const json = await res.json()

  if (json.loading && json.data === null) {
    return { data: null, loading: true, stale: false, updatedAt: null }
  }

  const envelope = json as CachedEnvelope<ResponseMap[M]>
  return {
    data: envelope.data,
    loading: false,
    stale: envelope.stale ?? false,
    updatedAt: envelope.updatedAt ?? null,
  }
}
