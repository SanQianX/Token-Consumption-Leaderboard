import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Settings, TestTube, Key, Copy, Check, ExternalLink } from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import { createApiToken, getServerUrl } from "@/lib/remote-api"

const APP_MODE = import.meta.env.VITE_APP_MODE || "local"

interface SettingsData {
  serverUrl: string
  apiToken: string
  _hasApiToken: boolean
  submitIntervalMinutes: number
  autoSubmitEnabled: boolean
  lastSubmitAt: string | null
  lastSubmitStatus: string | null
}

export function SettingsPage() {
  const { user, loading: authLoading } = useAuth()
  const [settings, setSettings] = useState<SettingsData>({
    serverUrl: "https://124.220.17.38",
    apiToken: "",
    _hasApiToken: false,
    submitIntervalMinutes: 30,
    autoSubmitEnabled: false,
    lastSubmitAt: null,
    lastSubmitStatus: null,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [testing, setTesting] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [copied, setCopied] = useState(false)
  const [generatedToken, setGeneratedToken] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        setSettings(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const handleSave = async (tokenToSave?: string) => {
    setSaving(true)
    setMessage(null)
    try {
      const payload = {
        ...settings,
        apiToken: tokenToSave ?? settings.apiToken,
      }
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (res.ok) {
        setSettings((s) => ({ ...s, apiToken: payload.apiToken, _hasApiToken: !!payload.apiToken }))
        setMessage({ type: "success", text: "Settings saved" })
      } else {
        setMessage({ type: "error", text: data.error || "Failed to save" })
      }
    } catch {
      setMessage({ type: "error", text: "Failed to save settings" })
    }
    setSaving(false)
  }

  const handleGenerateToken = async () => {
    setGenerating(true)
    setMessage(null)
    try {
      const data = await createApiToken()
      if (data.token) {
        setGeneratedToken(data.token)
        setSettings((s) => ({ ...s, apiToken: data.token, _hasApiToken: true }))
        await handleSave(data.token)
        setMessage({ type: "success", text: "API token generated and saved" })
      } else {
        setMessage({ type: "error", text: data.error || "Failed to generate token" })
      }
    } catch {
      setMessage({ type: "error", text: "Failed to generate token. Are you logged in?" })
    }
    setGenerating(false)
  }

  const handleCopy = async () => {
    const tokenToCopy = generatedToken || settings.apiToken
    if (!tokenToCopy || tokenToCopy.includes("*")) return
    try {
      await navigator.clipboard.writeText(tokenToCopy)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      const textarea = document.createElement("textarea")
      textarea.value = tokenToCopy
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand("copy")
      document.body.removeChild(textarea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
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
          setMessage({ type: "success", text: `Submitted! Tokens: ${data.totalTokens}, Cost: $${data.totalCost?.toFixed(2)}` })
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

  const showPlainToken = !!generatedToken
  const displayToken = showPlainToken ? generatedToken : settings.apiToken

  // In local mode, user must go to TokenRank Cloud to generate API Token
  // In remote mode, user can generate directly
  const canGenerateToken = APP_MODE === "remote" && !!user
  const serverUrl = settings.serverUrl || getServerUrl()

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <div className="flex items-center gap-2">
        <Settings className="h-6 w-6" />
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>TokenRank Cloud</CardTitle>
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
            <p className="mt-1.5 text-xs text-muted-foreground">
              The URL of your TokenRank Cloud server for uploading token data.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            API Token
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {APP_MODE === "local" && (
            <div className="rounded-md border border-border bg-muted/50 p-3 text-sm text-muted-foreground">
              To upload data, you need an API Token from TokenRank Cloud.{" "}
              <a
                href={`${serverUrl}/login`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-medium text-primary underline-offset-4 hover:underline"
              >
                Log in to TokenRank Cloud
                <ExternalLink className="h-3 w-3" />
              </a>{" "}
              to generate one, then paste it below.
            </div>
          )}
          {APP_MODE === "remote" && !user && !authLoading && (
            <div className="rounded-md border border-border bg-muted/50 p-3 text-sm text-muted-foreground">
              Please log in first to generate an API token.
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-sm font-medium">
              {settings._hasApiToken ? "API Token (configured)" : "API Token"}
            </label>
            <div className="flex gap-2">
              <input
                type={showPlainToken ? "text" : "password"}
                value={displayToken}
                onChange={(e) => {
                  setSettings({ ...settings, apiToken: e.target.value })
                  setGeneratedToken(null)
                }}
                placeholder={settings._hasApiToken ? "Token configured (hidden)" : "tl_xxxxx..."}
                className="flex-1 rounded-md border border-input bg-background px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              {canGenerateToken && (
                <Button
                  onClick={handleGenerateToken}
                  disabled={generating}
                  variant={settings._hasApiToken ? "outline" : "default"}
                  className="shrink-0"
                >
                  {generating ? "Generating..." : settings._hasApiToken ? "Regenerate" : "Generate"}
                </Button>
              )}
              {(showPlainToken || (settings.apiToken && !settings.apiToken.includes("*"))) && (
                <Button onClick={handleCopy} variant="outline" size="icon" className="shrink-0">
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              )}
            </div>
            {generatedToken && (
              <p className="mt-1.5 text-xs text-amber-600">
                Copy this token now. It will be hidden after you refresh the page.
              </p>
            )}
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

      {settings.lastSubmitAt && (
        <Card>
          <CardHeader>
            <CardTitle>Last Submit</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              <span className={settings.lastSubmitStatus === "success" ? "text-green-600" : "text-red-600"}>
                {settings.lastSubmitStatus === "success" ? "Success" : "Failed"}
              </span>
              {" - "}
              <span className="text-muted-foreground">
                {new Date(settings.lastSubmitAt).toLocaleString()}
              </span>
            </p>
          </CardContent>
        </Card>
      )}

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
        <Button onClick={() => handleSave()} disabled={saving}>
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
