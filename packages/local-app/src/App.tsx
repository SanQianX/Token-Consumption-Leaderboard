import { Routes, Route, Navigate } from "react-router"
import { Navbar } from "@/components/layout/Navbar"
import { HomePage } from "@/pages/HomePage"
import { LeaderboardPage } from "@/pages/LeaderboardPage"
import { ProfilePage } from "@/pages/ProfilePage"
import { LoginPage } from "@/pages/LoginPage"
import { SettingsPage } from "@/pages/SettingsPage"
import { AuthCallbackPage } from "@/pages/AuthCallbackPage"

// VITE_APP_MODE: "local" (default) or "remote"
const APP_MODE = import.meta.env.VITE_APP_MODE || "local"

function App() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <Routes>
        {APP_MODE === "remote" ? (
          // Remote mode: Leaderboard is the home page
          <>
            <Route path="/" element={<LeaderboardPage />} />
            <Route path="/leaderboard" element={<Navigate to="/" replace />} />
            <Route path="/profile/:username" element={<ProfilePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/auth/callback" element={<AuthCallbackPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </>
        ) : (
          // Local mode: Dashboard is the home page
          <>
            <Route path="/" element={<HomePage />} />
            <Route path="/leaderboard" element={<LeaderboardPage />} />
            <Route path="/profile/:username" element={<ProfilePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/auth/callback" element={<AuthCallbackPage />} />
          </>
        )}
      </Routes>
    </div>
  )
}

export default App
