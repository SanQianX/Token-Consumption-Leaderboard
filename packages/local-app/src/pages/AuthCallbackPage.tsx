import { useEffect } from "react"
import { useNavigate } from "react-router"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { setStoredToken } from "@/lib/remote-api"

export function AuthCallbackPage() {
  const navigate = useNavigate()

  useEffect(() => {
    // JWT token comes via URL query param from the remote server OAuth callback
    const params = new URLSearchParams(window.location.search)
    const token = params.get("token")

    if (token) {
      setStoredToken(token)
      // Clean URL and redirect
      window.history.replaceState({}, "", "/")
      navigate("/", { replace: true })
    } else {
      // No token found
      navigate("/login?error=no_token", { replace: true })
    }
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
