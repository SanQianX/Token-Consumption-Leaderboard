import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { BrowserRouter } from "react-router"
import { ErrorBoundary } from "@/components/ErrorBoundary"
import "./index.css"
import App from "./App.tsx"

const rootEl = document.getElementById("root")

if (!rootEl) {
  document.body.innerHTML =
    '<div style="padding:24px;font-family:sans-serif;">' +
    "<h1>页面初始化失败</h1>" +
    "<p>找不到 #root 挂载点，请刷新页面或联系开发者。</p>" +
    "</div>"
} else {
  // Hide the pre-mount skeleton once React takes over.
  const skeleton = document.getElementById("boot-skeleton")
  if (skeleton) skeleton.style.display = "none"

  // Surface uncaught errors so the ErrorBoundary fallback can show
  // a useful message instead of a blank page in old browsers.
  window.addEventListener("error", (e) => {
    console.error("[boot] uncaught error:", e.error || e.message)
  })
  window.addEventListener("unhandledrejection", (e) => {
    console.error("[boot] unhandled rejection:", e.reason)
  })

  createRoot(rootEl).render(
    <StrictMode>
      <ErrorBoundary>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ErrorBoundary>
    </StrictMode>,
  )
}