import { createContext, type ReactNode } from "react"

interface AuthContextType {
  user: null
  profile: null
  loading: false
  logout: () => void
}

export const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <AuthContext.Provider value={{ user: null, profile: null, loading: false, logout: () => {} }}>
      {children}
    </AuthContext.Provider>
  )
}
