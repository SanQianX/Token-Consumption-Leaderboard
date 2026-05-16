import { useState } from "react"
import { useNavigate, useSearchParams } from "react-router"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { loginWithGithub, register, verifyEmail, login, setStoredToken } from "@/lib/remote-api"

function GithubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
    </svg>
  )
}

type Tab = "github" | "email"
type EmailStep = "login" | "register" | "verify"

export function LoginPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [tab, setTab] = useState<Tab>("github")
  const [emailStep, setEmailStep] = useState<EmailStep>("login")

  // Email form state
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [username, setUsername] = useState("")
  const [code, setCode] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Check for error from OAuth redirect
  const oauthError = searchParams.get("error")

  const handleGithubLogin = () => {
    loginWithGithub()
  }

  const handleEmailLogin = async () => {
    setError(null)
    setLoading(true)
    try {
      const data = await login(email, password)
      if (data.error) {
        setError(data.error)
      } else if (data.token) {
        setStoredToken(data.token)
        navigate("/", { replace: true })
      }
    } catch {
      setError("Login failed. Please check your credentials.")
    }
    setLoading(false)
  }

  const handleRegister = async () => {
    setError(null)
    setLoading(true)
    try {
      const data = await register(email, password, username)
      if (data.error) {
        setError(data.error)
      } else {
        setEmailStep("verify")
      }
    } catch {
      setError("Registration failed. Please try again.")
    }
    setLoading(false)
  }

  const handleVerify = async () => {
    setError(null)
    setLoading(true)
    try {
      const data = await verifyEmail(email, code)
      if (data.error) {
        setError(data.error)
      } else if (data.token) {
        setStoredToken(data.token)
        navigate("/", { replace: true })
      }
    } catch {
      setError("Verification failed. Please try again.")
    }
    setLoading(false)
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Welcome</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Tab switcher */}
          <div className="flex rounded-lg border p-1">
            <button
              onClick={() => { setTab("github"); setError(null) }}
              className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                tab === "github" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
              }`}
            >
              GitHub
            </button>
            <button
              onClick={() => { setTab("email"); setError(null) }}
              className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                tab === "email" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
              }`}
            >
              Email
            </button>
          </div>

          {oauthError && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              OAuth login failed. Please try again.
            </div>
          )}

          {error && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* GitHub tab */}
          {tab === "github" && (
            <div className="space-y-4">
              <p className="text-center text-sm text-muted-foreground">
                Sign in with GitHub to submit your token usage data and appear on the leaderboard.
              </p>
              <Button onClick={handleGithubLogin} className="w-full gap-2" size="lg">
                <GithubIcon className="h-5 w-5" />
                Continue with GitHub
              </Button>
            </div>
          )}

          {/* Email tab */}
          {tab === "email" && emailStep === "login" && (
            <div className="space-y-4">
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <Button onClick={handleEmailLogin} disabled={loading} className="w-full" size="lg">
                {loading ? "Signing in..." : "Sign in"}
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                Don't have an account?{" "}
                <button
                  onClick={() => { setEmailStep("register"); setError(null) }}
                  className="text-primary underline hover:no-underline"
                >
                  Register
                </button>
              </p>
            </div>
          )}

          {tab === "email" && emailStep === "register" && (
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <input
                type="password"
                placeholder="Password (6+ characters)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <Button onClick={handleRegister} disabled={loading} className="w-full" size="lg">
                {loading ? "Sending code..." : "Send verification code"}
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <button
                  onClick={() => { setEmailStep("login"); setError(null) }}
                  className="text-primary underline hover:no-underline"
                >
                  Sign in
                </button>
              </p>
            </div>
          )}

          {tab === "email" && emailStep === "verify" && (
            <div className="space-y-4">
              <p className="text-center text-sm text-muted-foreground">
                A 6-digit code has been sent to <strong>{email}</strong>
              </p>
              <input
                type="text"
                placeholder="Verification code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                maxLength={6}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <Button onClick={handleVerify} disabled={loading || code.length < 6} className="w-full" size="lg">
                {loading ? "Verifying..." : "Verify & create account"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
