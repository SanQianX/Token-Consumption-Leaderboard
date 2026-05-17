import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Settings, TestTube } from "lucide-react"

interface SettingsData {
  serverUrl: string
  apiToken: string
  _hasApiToken: boolean
  submitIntervalMinutes: number
  autoSubmitEnabled: boolean
}

export function SettingsPage() {
  const [settings, setSettings] = useState<SettingsData>({
    serverUrl: "https://124.220.17.38",
    apiToken: "",
    _hasApiToken: false,
    submitIntervalMinutes: 30,
    autoSubmitEnabled: false,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        setSettings(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      })
      const data = await res.json()
      if (res.ok) {
        setMessage({ type: "success", text: "Settings saved" })
      } else {
        setMessage({ type: "error", text: data.error || "Failed to save" })
      }
    } catch {
      setMessage({ type: "error", text: "Failed to save settings" })
    }
    setSaving(false)
  }

  const handleTestSubmit = async () => {
    setTesting(true)
    setMessage(null)
    try {
      const res = await fetch("/api/settings/test-submit", { method: "POST" })
      const data = await res.json()
      if (res.ok) {
        if (data.duplicate) {
          setMessage({ type: "success", text: "Data already submitted (duplicate)" })
        } else {
          setMessage({ type: "success", text: `Submitted! Tokens: ${data.totalTokens}, Cost: ${data.totalCost}` })
        }
      } else {
        setMessage({ type: "error", text: data.error || "Test failed" })
      }
    } catch {
      setMessage({ type: "error", text: "Test submit failed" })
    }
    setTesting(false)
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 rounded bg-muted" />
          <div className="h-64 rounded-lg border" />
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <div className="flex items-center gap-2">
        <Settings className="h-6 w-6" />
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Remote Server</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium">Server URL</label>
            <input
              type="url"
              value={settings.serverUrl}
              onChange={(e) => setSettings({ ...settings, serverUrl: e.target.value })}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="https://124.220.17.38"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Auto Submit</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Enable auto-submit</p>
              <p className="text-xs text-muted-foreground">
                Automatically submit your token data every {settings.submitIntervalMinutes} minutes
              </p>
            </div>
            <button
              onClick={() => setSettings({ ...settings, autoSubmitEnabled: !settings.autoSubmitEnabled })}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                settings.autoSubmitEnabled ? "bg-primary" : "bg-muted"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform ${
                  settings.autoSubmitEnabled ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">API Token</label>
            <input
              type="password"
              value={settings.apiToken}
              onChange={(e) => setSettings({ ...settings, apiToken: e.target.value })}
              placeholder={settings._hasApiToken ? "Token configured (hidden)" : "tl_xxxxx..."}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Generate an API token from the remote server after logging in
            </p>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">Submit Interval (minutes)</label>
            <input
              type="number"
              min={5}
              max={1440}
              value={settings.submitIntervalMinutes}
              onChange={(e) => setSettings({ ...settings, submitIntervalMinutes: parseInt(e.target.value) || 30 })}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </CardContent>
      </Card>

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

      <div className="flex gap-3">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save Settings"}
        </Button>
        <Button onClick={handleTestSubmit} disabled={testing} variant="outline" className="gap-2">
          <TestTube className="h-4 w-4" />
          {testing ? "Testing..." : "Test Submit"}
        </Button>
      </div>
    </div>
  )
}
