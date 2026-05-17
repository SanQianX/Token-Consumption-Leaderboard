import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Shield, Users, FileText, Trophy, Settings, RefreshCw, Trash2, Pencil } from "lucide-react"
import {
  fetchAdminUsers,
  updateAdminUser,
  deleteAdminUser,
  fetchAdminSubmissions,
  deleteAdminSubmission,
  fetchAdminSettings,
  updateAdminSettings,
  refreshLeaderboard,
} from "@/lib/admin-api"

type Tab = "users" | "submissions" | "leaderboard" | "settings"

interface AdminUser {
  id: string
  username: string
  email: string
  auth_provider: string
  is_admin: boolean
  created_at: string
}

interface AdminSubmission {
  id: string
  username: string
  type: string
  total_tokens: number
  total_cost: number
  created_at: string
}

const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: "users", label: "Users", icon: <Users className="h-4 w-4" /> },
  { key: "submissions", label: "Submissions", icon: <FileText className="h-4 w-4" /> },
  { key: "leaderboard", label: "Leaderboard", icon: <Trophy className="h-4 w-4" /> },
  { key: "settings", label: "Settings", icon: <Settings className="h-4 w-4" /> },
]

export function AdminPage() {
  const [activeTab, setActiveTab] = useState<Tab>("users")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  // Users state
  const [users, setUsers] = useState<AdminUser[]>([])
  const [usersPage, setUsersPage] = useState(1)
  const [usersTotal, setUsersTotal] = useState(0)
  const [editingUserId, setEditingUserId] = useState<string | null>(null)
  const [editUsername, setEditUsername] = useState("")

  // Submissions state
  const [submissions, setSubmissions] = useState<AdminSubmission[]>([])
  const [submissionsPage, setSubmissionsPage] = useState(1)
  const [submissionsTotal, setSubmissionsTotal] = useState(0)
  const [submissionsType, setSubmissionsType] = useState<string>("")

  // Leaderboard state
  const [leaderboardInfo, setLeaderboardInfo] = useState<Record<string, unknown> | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  // Settings state
  const [adminSettings, setAdminSettings] = useState({
    smtp_host: "",
    smtp_port: "",
    smtp_user: "",
    smtp_pass: "",
  })
  const [savingSettings, setSavingSettings] = useState(false)

  const clearMessage = () => {
    setMessage(null)
    setError(null)
  }

  // --- Users ---
  const loadUsers = useCallback(async (page: number) => {
    setLoading(true)
    clearMessage()
    try {
      const data = await fetchAdminUsers(page)
      if (data.error) {
        setError(data.error)
      } else {
        setUsers(data.users || [])
        setUsersTotal(data.total || 0)
      }
    } catch {
      setError("Failed to load users")
    }
    setLoading(false)
  }, [])

  // --- Submissions ---
  const loadSubmissions = useCallback(async (page: number, type?: string) => {
    setLoading(true)
    clearMessage()
    try {
      const data = await fetchAdminSubmissions(page, type || undefined)
      if (data.error) {
        setError(data.error)
      } else {
        setSubmissions(data.submissions || [])
        setSubmissionsTotal(data.total || 0)
      }
    } catch {
      setError("Failed to load submissions")
    }
    setLoading(false)
  }, [])

  // --- Leaderboard ---
  const loadLeaderboardInfo = useCallback(async () => {
    setLoading(true)
    clearMessage()
    try {
      const data = await fetchAdminSettings()
      if (data.error) {
        setError(data.error)
      } else {
        setLeaderboardInfo(data.leaderboard || data)
      }
    } catch {
      setError("Failed to load leaderboard info")
    }
    setLoading(false)
  }, [])

  // --- Settings ---
  const loadSettings = useCallback(async () => {
    setLoading(true)
    clearMessage()
    try {
      const data = await fetchAdminSettings()
      if (data.error) {
        setError(data.error)
      } else {
        setAdminSettings({
          smtp_host: data.smtp_host || "",
          smtp_port: data.smtp_port || "",
          smtp_user: data.smtp_user || "",
          smtp_pass: data.smtp_pass || "",
        })
      }
    } catch {
      setError("Failed to load settings")
    }
    setLoading(false)
  }, [])

  // Load data when tab changes
  useEffect(() => {
    if (activeTab === "users") loadUsers(usersPage)
    else if (activeTab === "submissions") loadSubmissions(submissionsPage, submissionsType)
    else if (activeTab === "leaderboard") loadLeaderboardInfo()
    else if (activeTab === "settings") loadSettings()
  }, [activeTab, usersPage, submissionsPage, submissionsType, loadUsers, loadSubmissions, loadLeaderboardInfo, loadSettings])

  // --- Handlers ---
  const handleDeleteUser = async (id: string) => {
    if (!confirm("Are you sure you want to delete this user?")) return
    clearMessage()
    try {
      const data = await deleteAdminUser(id)
      if (data.error) {
        setMessage({ type: "error", text: data.error })
      } else {
        setMessage({ type: "success", text: "User deleted" })
        loadUsers(usersPage)
      }
    } catch {
      setMessage({ type: "error", text: "Failed to delete user" })
    }
  }

  const handleToggleAdmin = async (user: AdminUser) => {
    clearMessage()
    try {
      const data = await updateAdminUser(user.id, { is_admin: !user.is_admin })
      if (data.error) {
        setMessage({ type: "error", text: data.error })
      } else {
        setMessage({ type: "success", text: `Admin status updated for ${user.username}` })
        loadUsers(usersPage)
      }
    } catch {
      setMessage({ type: "error", text: "Failed to update user" })
    }
  }

  const handleStartEditUsername = (user: AdminUser) => {
    setEditingUserId(user.id)
    setEditUsername(user.username)
  }

  const handleSaveUsername = async (id: string) => {
    clearMessage()
    try {
      const data = await updateAdminUser(id, { username: editUsername })
      if (data.error) {
        setMessage({ type: "error", text: data.error })
      } else {
        setMessage({ type: "success", text: "Username updated" })
        setEditingUserId(null)
        loadUsers(usersPage)
      }
    } catch {
      setMessage({ type: "error", text: "Failed to update username" })
    }
  }

  const handleDeleteSubmission = async (id: string) => {
    if (!confirm("Are you sure you want to delete this submission?")) return
    clearMessage()
    try {
      const data = await deleteAdminSubmission(id)
      if (data.error) {
        setMessage({ type: "error", text: data.error })
      } else {
        setMessage({ type: "success", text: "Submission deleted" })
        loadSubmissions(submissionsPage, submissionsType)
      }
    } catch {
      setMessage({ type: "error", text: "Failed to delete submission" })
    }
  }

  const handleRefreshLeaderboard = async () => {
    setRefreshing(true)
    clearMessage()
    try {
      const data = await refreshLeaderboard()
      if (data.error) {
        setMessage({ type: "error", text: data.error })
      } else {
        setMessage({ type: "success", text: "Leaderboard refreshed" })
      }
    } catch {
      setMessage({ type: "error", text: "Failed to refresh leaderboard" })
    }
    setRefreshing(false)
  }

  const handleSaveSettings = async () => {
    setSavingSettings(true)
    clearMessage()
    try {
      const data = await updateAdminSettings(adminSettings)
      if (data.error) {
        setMessage({ type: "error", text: data.error })
      } else {
        setMessage({ type: "success", text: "Settings saved" })
      }
    } catch {
      setMessage({ type: "error", text: "Failed to save settings" })
    }
    setSavingSettings(false)
  }

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString()
    } catch {
      return dateStr
    }
  }

  const formatNumber = (n: number) => {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + "M"
    if (n >= 1_000) return (n / 1_000).toFixed(1) + "K"
    return n.toLocaleString()
  }

  const USERS_PER_PAGE = 20
  const SUBMISSIONS_PER_PAGE = 20

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex items-center gap-2">
        <Shield className="h-6 w-6" />
        <h1 className="text-2xl font-bold tracking-tight">Admin Panel</h1>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 rounded-lg border bg-muted/50 p-1">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Message banner */}
      {message && (
        <div
          className={`rounded-md border p-3 text-sm ${
            message.type === "success"
              ? "border-green-500/50 bg-green-500/10 text-green-600"
              : "border-destructive/50 bg-destructive/10 text-destructive"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="rounded-lg border p-8 text-center text-muted-foreground">
          <div className="mx-auto mb-2 h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          Loading...
        </div>
      )}

      {/* Users Tab */}
      {!loading && activeTab === "users" && (
        <Card>
          <CardHeader>
            <CardTitle>Users ({usersTotal})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Username</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Auth Provider</TableHead>
                    <TableHead>Admin</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                        No users found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          {editingUserId === user.id ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="text"
                                value={editUsername}
                                onChange={(e) => setEditUsername(e.target.value)}
                                className="w-32 rounded border border-input bg-background px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") handleSaveUsername(user.id)
                                  if (e.key === "Escape") setEditingUserId(null)
                                }}
                              />
                              <Button size="xs" onClick={() => handleSaveUsername(user.id)}>
                                Save
                              </Button>
                              <Button size="xs" variant="outline" onClick={() => setEditingUserId(null)}>
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <span className="font-medium">{user.username}</span>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{user.email || "-"}</TableCell>
                        <TableCell className="text-muted-foreground">{user.auth_provider}</TableCell>
                        <TableCell>
                          <button
                            onClick={() => handleToggleAdmin(user)}
                            className={`inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                              user.is_admin ? "bg-primary" : "bg-muted"
                            }`}
                          >
                            <span
                              className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform ${
                                user.is_admin ? "translate-x-5" : "translate-x-0"
                              }`}
                            />
                          </button>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{formatDate(user.created_at)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="icon-xs"
                              variant="ghost"
                              onClick={() => handleStartEditUsername(user)}
                              title="Edit username"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="icon-xs"
                              variant="ghost"
                              onClick={() => handleDeleteUser(user.id)}
                              title="Delete user"
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {usersTotal > USERS_PER_PAGE && (
              <div className="flex items-center justify-between pt-4">
                <p className="text-sm text-muted-foreground">
                  Page {usersPage} of {Math.ceil(usersTotal / USERS_PER_PAGE)}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setUsersPage((p) => Math.max(1, p - 1))}
                    disabled={usersPage <= 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setUsersPage((p) => p + 1)}
                    disabled={usersPage >= Math.ceil(usersTotal / USERS_PER_PAGE)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Submissions Tab */}
      {!loading && activeTab === "submissions" && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Submissions ({submissionsTotal})</CardTitle>
              <select
                value={submissionsType}
                onChange={(e) => {
                  setSubmissionsType(e.target.value)
                  setSubmissionsPage(1)
                }}
                className="rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">All Types</option>
                <option value="daily">Daily</option>
                <option value="monthly">Monthly</option>
                <option value="blocks">Blocks</option>
              </select>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Tokens</TableHead>
                    <TableHead>Cost</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {submissions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                        No submissions found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    submissions.map((sub) => (
                      <TableRow key={sub.id}>
                        <TableCell className="font-medium">{sub.username}</TableCell>
                        <TableCell>
                          <span className="inline-flex rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                            {sub.type}
                          </span>
                        </TableCell>
                        <TableCell>{formatNumber(sub.total_tokens)}</TableCell>
                        <TableCell>${sub.total_cost?.toFixed(2) || "0.00"}</TableCell>
                        <TableCell className="text-muted-foreground">{formatDate(sub.created_at)}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="icon-xs"
                            variant="ghost"
                            onClick={() => handleDeleteSubmission(sub.id)}
                            title="Delete submission"
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {submissionsTotal > SUBMISSIONS_PER_PAGE && (
              <div className="flex items-center justify-between pt-4">
                <p className="text-sm text-muted-foreground">
                  Page {submissionsPage} of {Math.ceil(submissionsTotal / SUBMISSIONS_PER_PAGE)}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSubmissionsPage((p) => Math.max(1, p - 1))}
                    disabled={submissionsPage <= 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSubmissionsPage((p) => p + 1)}
                    disabled={submissionsPage >= Math.ceil(submissionsTotal / SUBMISSIONS_PER_PAGE)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Leaderboard Tab */}
      {!loading && activeTab === "leaderboard" && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Leaderboard Cache</CardTitle>
              <Button onClick={handleRefreshLeaderboard} disabled={refreshing} className="gap-2">
                <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                {refreshing ? "Refreshing..." : "Force Refresh"}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {leaderboardInfo ? (
              <div className="rounded-md border">
                <Table>
                  <TableBody>
                    {Object.entries(leaderboardInfo).map(([key, value]) => (
                      <TableRow key={key}>
                        <TableCell className="font-medium">{key}</TableCell>
                        <TableCell>
                          {typeof value === "object" ? JSON.stringify(value) : String(value)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No leaderboard info available.</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Settings Tab */}
      {!loading && activeTab === "settings" && (
        <Card>
          <CardHeader>
            <CardTitle>SMTP Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium">SMTP Host</label>
              <input
                type="text"
                value={adminSettings.smtp_host}
                onChange={(e) => setAdminSettings({ ...adminSettings, smtp_host: e.target.value })}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="smtp.163.com"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">SMTP Port</label>
              <input
                type="text"
                value={adminSettings.smtp_port}
                onChange={(e) => setAdminSettings({ ...adminSettings, smtp_port: e.target.value })}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="465"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">SMTP User</label>
              <input
                type="text"
                value={adminSettings.smtp_user}
                onChange={(e) => setAdminSettings({ ...adminSettings, smtp_user: e.target.value })}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="user@example.com"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">SMTP Password</label>
              <input
                type="password"
                value={adminSettings.smtp_pass}
                onChange={(e) => setAdminSettings({ ...adminSettings, smtp_pass: e.target.value })}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Authorization code"
              />
            </div>
            <Button onClick={handleSaveSettings} disabled={savingSettings}>
              {savingSettings ? "Saving..." : "Save Settings"}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
