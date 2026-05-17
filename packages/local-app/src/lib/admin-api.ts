function getHeaders(): Record<string, string> {
  const token = localStorage.getItem("auth_token")
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

function getServerUrl(): string {
  const stored = localStorage.getItem("serverUrl")
  if (stored) return stored
  if (import.meta.env.VITE_APP_MODE === "remote" && window.location.protocol !== "file:") {
    return window.location.origin
  }
  return "https://124.220.17.38"
}

export async function fetchAdminUsers(page = 1) {
  const res = await fetch(`${getServerUrl()}/api/admin/users?page=${page}`, { headers: getHeaders() })
  return res.json()
}

export async function updateAdminUser(id: string, data: Record<string, unknown>) {
  const res = await fetch(`${getServerUrl()}/api/admin/users/${id}`, {
    method: "PUT",
    headers: getHeaders(),
    body: JSON.stringify(data),
  })
  return res.json()
}

export async function deleteAdminUser(id: string) {
  const res = await fetch(`${getServerUrl()}/api/admin/users/${id}`, {
    method: "DELETE",
    headers: getHeaders(),
  })
  return res.json()
}

export async function fetchAdminSubmissions(page = 1, type?: string) {
  const qs = type ? `?page=${page}&type=${type}` : `?page=${page}`
  const res = await fetch(`${getServerUrl()}/api/admin/submissions${qs}`, { headers: getHeaders() })
  return res.json()
}

export async function deleteAdminSubmission(id: string) {
  const res = await fetch(`${getServerUrl()}/api/admin/submissions/${id}`, {
    method: "DELETE",
    headers: getHeaders(),
  })
  return res.json()
}

export async function fetchAdminSettings() {
  const res = await fetch(`${getServerUrl()}/api/admin/settings`, { headers: getHeaders() })
  return res.json()
}

export async function updateAdminSettings(settings: Record<string, string>) {
  const res = await fetch(`${getServerUrl()}/api/admin/settings`, {
    method: "PUT",
    headers: getHeaders(),
    body: JSON.stringify(settings),
  })
  return res.json()
}

export async function refreshLeaderboard() {
  const res = await fetch(`${getServerUrl()}/api/admin/leaderboard/refresh`, {
    method: "POST",
    headers: getHeaders(),
  })
  return res.json()
}
