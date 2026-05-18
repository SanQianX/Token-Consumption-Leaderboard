import { test, expect } from "@playwright/test"

const LOCAL_URL = "http://localhost:5173"
const TEST_JWT = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0IiwidXNlcm5hbWUiOiJ0ZXN0IiwiaWF0IjoxNzc5MTI4NjQwLCJleHAiOjE3Nzk3MzM0NDB9.AeV7-mykxz6W5zBZk7h4njuxqT1U4acRb_-UHM12roo"

test.describe("Local AuthCallbackPage debug", () => {
  test("Track URL changes during page load", async ({ browser }) => {
    const context = await browser.newContext()
    const page = await context.newPage()

    const urlChanges: string[] = []
    page.on("framenavigated", (frame) => {
      urlChanges.push(`NAVIGATED: ${frame.url()}`)
    })

    const logs: string[] = []
    page.on("console", (msg) => logs.push(`[${msg.type()}] ${msg.text()}`))

    // Intercept the page to inject debug before React loads
    await page.route("**/auth/callback**", async (route) => {
      const url = route.request().url()
      console.log("INTERCEPTED request to:", url)

      // Check if token is in the URL at request time
      const u = new URL(url)
      const token = u.searchParams.get("token")
      console.log("Token at request time:", token ? `${token.slice(0, 20)}...` : "NULL")

      // Continue with the real response
      const response = await route.fetch()
      const body = await response.text()
      console.log("Response HTML includes auth/callback:", body.includes("root"))

      await route.fulfill({ response, body })
    })

    const targetUrl = `${LOCAL_URL}/auth/callback?token=${TEST_JWT}`
    console.log("Navigating to:", targetUrl)

    await page.goto(targetUrl, {
      waitUntil: "domcontentloaded",
      timeout: 10000,
    })

    console.log("\nAfter domcontentloaded, URL:", page.url())

    await page.waitForTimeout(3000)

    console.log("\nAfter 3s, URL:", page.url())

    console.log("\nURL changes:")
    urlChanges.forEach((u) => console.log(" ", u))

    console.log("\nConsole logs:")
    logs.forEach((l) => console.log(" ", l))

    // Check what the AuthCallbackPage sees
    const debugInfo = await page.evaluate(() => {
      return {
        currentUrl: window.location.href,
        search: window.location.search,
        localStorage_token: localStorage.getItem("auth_token"),
      }
    })
    console.log("\nDebug info:", JSON.stringify(debugInfo, null, 2))

    await context.close()
  })
})
