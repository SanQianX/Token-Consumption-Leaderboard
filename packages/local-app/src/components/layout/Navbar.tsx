import { Link, useLocation } from "react-router"
import { Trophy, LayoutDashboard, Settings } from "lucide-react"
import { cn } from "@/lib/utils"
import { LoginButton } from "@/components/auth/LoginButton"
import { UserMenu } from "@/components/auth/UserMenu"
import { useAuth } from "@/hooks/useAuth"
import { getServerUrl } from "@/lib/remote-api"

const APP_MODE = import.meta.env.VITE_APP_MODE || "local"

export function Navbar() {
  const location = useLocation()
  const { user } = useAuth()

  return (
    <nav className="border-b border-border bg-card">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
        <div className="flex items-center gap-6">
          <Link to="/" className="text-lg font-semibold tracking-tight">
            Token Leaderboard
          </Link>
          <div className="flex items-center gap-1">
            {APP_MODE === "remote" ? (
              // Remote mode links
              <>
                <Link
                  to="/"
                  className={cn(
                    "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                    location.pathname === "/"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <Trophy className="h-4 w-4" />
                  Leaderboard
                </Link>
              </>
            ) : (
              // Local mode links
              <>
                <Link
                  to="/"
                  className={cn(
                    "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                    location.pathname === "/"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <LayoutDashboard className="h-4 w-4" />
                  Dashboard
                </Link>
                <button
                  onClick={() => window.open(getServerUrl(), "_blank")}
                  className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <Trophy className="h-4 w-4" />
                  Leaderboard
                </button>
                <Link
                  to="/settings"
                  className={cn(
                    "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                    location.pathname === "/settings"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <Settings className="h-4 w-4" />
                  Settings
                </Link>
              </>
            )}
          </div>
        </div>
        <div>
          {user ? <UserMenu /> : <LoginButton />}
        </div>
      </div>
    </nav>
  )
}
