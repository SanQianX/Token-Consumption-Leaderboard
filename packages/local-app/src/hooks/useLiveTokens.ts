import { useEffect, useState } from "react"
import type { LiveSnapshot } from "@/lib/types"

export interface UseLiveTokensResult {
  snapshot: LiveSnapshot | null
  connected: boolean
}

export interface UseLiveTokensOptions {
  enabled?: boolean
}

export function useLiveTokens(opts: UseLiveTokensOptions = {}): UseLiveTokensResult {
  const enabled = opts.enabled ?? true
  const [snapshot, setSnapshot] = useState<LiveSnapshot | null>(null)
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    if (!enabled) {
      setSnapshot(null)
      setConnected(false)
      return
    }

    const es = new EventSource("/api/live/stream")

    es.onopen = () => setConnected(true)
    es.onerror = () => setConnected(false)

    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data)
        if (data && (data.type === "snapshot" || data.type === "delta")) {
          const { type: _t, ...snap } = data
          void _t
          setSnapshot(snap as LiveSnapshot)
          setConnected(true)
        }
      } catch {
        // ignore malformed payloads
      }
    }

    return () => {
      es.close()
    }
  }, [enabled])

  return { snapshot, connected }
}