import { Link, useLocation } from "react-router"
import { LayoutDashboard } from "lucide-react"
import { cn } from "@/lib/utils"

export function Navbar() {
  const location = useLocation()

  return (
    <nav className="border-b border-border bg-card">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
        <div className="flex items-center gap-6">
          <Link to="/" className="text-lg font-semibold tracking-tight">
            TokenMeter
          </Link>
          <div className="flex items-center gap-1">
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
          </div>
        </div>
      </div>
    </nav>
  )
}
