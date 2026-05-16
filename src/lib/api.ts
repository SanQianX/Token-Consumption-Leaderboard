import type {
  DailyResponse,
  MonthlyResponse,
  SessionResponse,
  BlocksResponse,
  ViewMode,
  CachedEnvelope,
} from "./types"

type ResponseMap = {
  daily: DailyResponse
  monthly: MonthlyResponse
  session: SessionResponse
  blocks: BlocksResponse
}

export interface FetchResult<T> {
  data: T | null
  loading: boolean   // true = first fetch in progress, no cache yet
  stale: boolean     // true = showing cached data, refresh in progress
  updatedAt: string | null
}

export async function fetchData<M extends ViewMode>(
  mode: M,
): Promise<FetchResult<ResponseMap[M]>> {
  const res = await fetch(`/api/${mode}`)
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`)
  }

  const json = await res.json()

  // First-time: no cache yet, server returns { data: null, loading: true }
  if (json.loading && json.data === null) {
    return { data: null, loading: true, stale: false, updatedAt: null }
  }

  // Cached response: server returns { data: ..., updatedAt, stale, refreshing }
  const envelope = json as CachedEnvelope<ResponseMap[M]>
  return {
    data: envelope.data,
    loading: false,
    stale: envelope.stale ?? false,
    updatedAt: envelope.updatedAt ?? null,
  }
}
