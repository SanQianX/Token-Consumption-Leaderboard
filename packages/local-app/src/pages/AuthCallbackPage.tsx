import { useEffect } from "react"
import { useNavigate } from "react-router"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { setStoredToken } from "@/lib/remote-api"

// Eagerly capture token from URL at module load time, before anything else can clear it
const initialSearch = typeof window !== "undefined" ? window.location.search : ""
const initialParams = new URLSearchParams(initialSearch)
const capturedToken = initialParams.get("token")
const capturedReturnTo = initialParams.get("return_to")

export function AuthCallbackPage() {
  const navigate = useNavigate()

  useEffect(() => {
    const token = capturedToken
    const returnTo = capturedReturnTo

    if (!token) {
      navigate("/login?error=no_token", { replace: true })
      return
    }

    setStoredToken(token)

    if (returnTo && /^http:\/\/localhost(:\d+)?$/.test(returnTo)) {
      window.location.href = `${returnTo}/auth/callback?token=${encodeURIComponent(token)}`
      return
    }

    navigate("/", { replace: true })
  }, [navigate])

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">Signing in...</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Skeleton className="h-8 w-48" />
        </CardContent>
      </Card>
    </div>
  )
}
