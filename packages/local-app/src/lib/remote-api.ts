const DEFAULT_SERVER_URL = "http://124.220.17.38"

function getServerUrl(): string {
  return localStorage.getItem("serverUrl") || DEFAULT_SERVER_URL
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

// Auth APIs
export async function loginWithGithub() {
  const serverUrl = getServerUrl()
  window.location.href = `${serverUrl}/api/auth/github`
}

export async function register(email: string, password: string, username: string) {
  const res = await apiRequest("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password, username }),
  })
  return res.json()
}

export async function verifyEmail(email: string, code: string) {
  const res = await apiRequest("/api/auth/verify-email", {
    method: "POST",
    body: JSON.stringify({ email, code }),
  })
  return res.json()
}

export async function login(email: string, password: string) {
  const res = await apiRequest("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  })
  return res.json()
}

export async function getMe() {
  const res = await apiRequest("/api/auth/me")
  if (!res.ok) return null
  return res.json()
}

export async function createApiToken(name = "default") {
  const res = await apiRequest("/api/auth/api-token", {
    method: "POST",
    body: JSON.stringify({ name }),
  })
  return res.json()
}

// Leaderboard APIs
export async function fetchLeaderboard(params: {
  period?: string
  sort?: string
  page?: number
  limit?: number
}) {
  const serverUrl = getServerUrl()
  const qs = new URLSearchParams()
  if (params.period) qs.set("period", params.period)
  if (params.sort) qs.set("sort", params.sort)
  if (params.page) qs.set("page", String(params.page))
  if (params.limit) qs.set("limit", String(params.limit))

  const res = await fetch(`${serverUrl}/api/leaderboard?${qs}`)
  return res.json()
}

// Profile APIs
export async function fetchProfile(username: string) {
  const serverUrl = getServerUrl()
  const res = await fetch(`${serverUrl}/api/profile/${username}`)
  if (!res.ok) throw new Error("User not found")
  return res.json()
}

export async function fetchProfileData(username: string, type: string) {
  const serverUrl = getServerUrl()
  const res = await fetch(`${serverUrl}/api/profile/${username}/data?type=${type}`)
  return res.json()
}

// Submit API
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

export { getServerUrl }
