import { Routes, Route, Navigate } from "react-router"
import { Navbar } from "@/components/layout/Navbar"
import { HomePage } from "@/pages/HomePage"
import { SettingsPage } from "@/pages/SettingsPage"

function App() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}

export default App
