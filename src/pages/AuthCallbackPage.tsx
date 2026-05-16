import { useEffect } from "react"
import { useNavigate } from "react-router"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export function AuthCallbackPage() {
  const navigate = useNavigate()

  useEffect(() => {
    // The OAuth callback is handled by Supabase.
    // When redirected here, exchange the code for a session.
    const hashParams = new URLSearchParams(window.location.hash.slice(1))
    const code = hashParams.get("code") || new URLSearchParams(window.location.search).get("code")

    if (!code) {
      navigate("/", { replace: true })
      return
    }

    // Call our API to exchange the code
    fetch(`/api/auth/callback?code=${encodeURIComponent(code)}`)
      .then((res) => {
        if (!res.ok) throw new Error("Auth callback failed")
        return res.json()
      })
      .then(() => {
        navigate("/", { replace: true })
      })
      .catch(() => {
        navigate("/", { replace: true })
      })
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
