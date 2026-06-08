const DEFAULT_SERVER_URL = "https://124.220.17.38"

export function getServerUrl(): string {
  const stored = localStorage.getItem("serverUrl")
  if (stored) return stored
  return DEFAULT_SERVER_URL
}

function getStoredToken(): string | null {
  return localStorage.getItem("auth_token")
}

export function setStoredToken(token: string | null) {
  if (token) {
    localStorage.setItem("auth_token", token)
  } else {
    localStorage.removeItem("auth_token")
  }
}

async function apiRequest(path: string, options: RequestInit = {}): Promise<Response> {
  const serverUrl = getServerUrl()
  const token = getStoredToken()

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...options.headers as Record<string, string>,
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`
  }

  return fetch(`${serverUrl}${path}`, { ...options, headers })
}

export async function createApiToken(name = "default") {
  const res = await apiRequest("/api/auth/api-token", {
    method: "POST",
    body: JSON.stringify({ name }),
  })
  return res.json()
}

export async function submitData(type: string, payload: unknown, apiToken: string) {
  const serverUrl = getServerUrl()
  const res = await fetch(`${serverUrl}/api/submit`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Token": apiToken,
    },
    body: JSON.stringify({ type, payload }),
  })
  return res.json()
}
