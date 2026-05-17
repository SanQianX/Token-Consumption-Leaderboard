import { createContext, useState, useEffect, useCallback, type ReactNode } from "react"
import { setStoredToken, getMe } from "@/lib/remote-api"

interface UserProfile {
  username: string
  display_name: string | null
  avatar_url: string | null
  bio: string | null
}

interface UserInfo {
  id: string
  username: string
  is_admin?: boolean
}

interface AuthContextType {
  user: UserInfo | null
  profile: UserProfile | null
  loading: boolean
  logout: () => void
}

export const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserInfo | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check for token from OAuth callback
    const params = new URLSearchParams(window.location.search)
    const tokenParam = params.get("token")
    if (tokenParam) {
      setStoredToken(tokenParam)
      // Clean URL
      window.history.replaceState({}, "", window.location.pathname)
    }

    // Load user from stored token
    const loadUser = async () => {
      const token = localStorage.getItem("auth_token")
      if (!token) {
        setLoading(false)
        return
      }

      try {
        const data = await getMe()
        if (data?.user) {
          setUser(data.user)
          setProfile(data.profile)
        } else {
          setStoredToken(null)
        }
      } catch {
        setStoredToken(null)
      }
      setLoading(false)
    }

    loadUser()
  }, [])

  const logout = useCallback(() => {
    setStoredToken(null)
    setUser(null)
    setProfile(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, profile, loading, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
