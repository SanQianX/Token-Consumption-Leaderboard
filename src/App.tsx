import { Routes, Route } from "react-router"
import { Navbar } from "@/components/layout/Navbar"
import { HomePage } from "@/pages/HomePage"
import { LeaderboardPage } from "@/pages/LeaderboardPage"
import { ProfilePage } from "@/pages/ProfilePage"
import { LoginPage } from "@/pages/LoginPage"
import { AuthCallbackPage } from "@/pages/AuthCallbackPage"

function App() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/leaderboard" element={<LeaderboardPage />} />
        <Route path="/profile/:username" element={<ProfilePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
      </Routes>
    </div>
  )
}

export default App
