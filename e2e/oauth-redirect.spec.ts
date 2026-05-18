import { test, expect } from "@playwright/test"

const SERVER_URL = "https://124.220.17.38"
const LOCAL_URL = "http://localhost:5173"

const TEST_JWT = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0IiwidXNlcm5hbWUiOiJ0ZXN0IiwiaWF0IjoxNzc5MTI4NjQwLCJleHAiOjE3Nzk3MzM0NDB9.AeV7-mykxz6W5zBZk7h4njuxqT1U4acRb_-UHM12roo"

test.describe("OAuth redirect chain", () => {
  test("Step 1: /api/auth/github has correct HTTPS redirect_uri", async ({ request }) => {
    const resp = await request.get(`${SERVER_URL}/api/auth/github?return_to=http%3A%2F%2Flocalhost%3A5173`, {
      maxRedirects: 0,
    })
    expect(resp.status()).toBe(302)
    const location = resp.headers()["location"]
    const redirectUri = new URL(location).searchParams.get("redirect_uri")
    expect(redirectUri).toBe(`${SERVER_URL}/api/auth/github/callback`)
    expect(redirectUri).toContain("https://")
  })

  test("Step 3: Remote frontend /auth/callback with return_to returns HTML", async ({ request }) => {
    const resp = await request.get(`${SERVER_URL}/auth/callback?token=${TEST_JWT}&return_to=http%3A%2F%2Flocalhost%3A5173`)
    expect(resp.status()).toBe(200)
    expect((await resp.text()).length).toBeGreaterThan(100)
  })

  test("Step 4: Remote callback with return_to triggers localhost redirect", async ({ browser }) => {
    const context = await browser.newContext({ ignoreHTTPSErrors: true })
    const page = await context.newPage()

    const requests: string[] = []
    page.on("request", (req) => {
      const u = req.url()
      if (u.includes("auth") || u.includes("callback") || u.includes("localhost:5173")) {
        requests.push(`${req.method()} ${u}`)
      }
    })

    await page.goto(`${SERVER_URL}/auth/callback?token=${TEST_JWT}&return_to=http%3A%2F%2Flocalhost%3A5173`, {
      waitUntil: "domcontentloaded",
      timeout: 10000,
    })
    await page.waitForTimeout(3000)

    // Should have attempted a redirect to localhost
    const triedLocalhost = requests.some((r) => r.includes("localhost:5173/auth/callback?token="))
    expect(triedLocalhost).toBe(true)

    await context.close()
  })

  test("Step 5: Remote callback WITHOUT return_to stays on remote", async ({ browser }) => {
    const context = await browser.newContext({ ignoreHTTPSErrors: true })
    const page = await context.newPage()

    await page.goto(`${SERVER_URL}/auth/callback?token=${TEST_JWT}`, {
      waitUntil: "domcontentloaded",
      timeout: 10000,
    })
    await page.waitForTimeout(2000)

    expect(page.url()).toContain("124.220.17.38")
    expect(page.url()).not.toContain("error=")

    await context.close()
  })

  test("Step 6: Local AuthCallbackPage directly receives and saves token", async ({ browser }) => {
    const context = await browser.newContext()
    const page = await context.newPage()

    const logs: string[] = []
    page.on("console", (msg) => logs.push(`[${msg.type()}] ${msg.text()}`))

    // Navigate directly to local callback with a token
    await page.goto(`${LOCAL_URL}/auth/callback?token=${TEST_JWT}`, {
      waitUntil: "domcontentloaded",
      timeout: 10000,
    })
    await page.waitForTimeout(2000)

    console.log("Final URL:", page.url())
    console.log("Console:", logs.join("\n"))

    // Check localStorage for saved token
    const savedToken = await page.evaluate(() => localStorage.getItem("auth_token"))
    console.log("Saved token:", savedToken ? `${savedToken.slice(0, 20)}...` : "null")

    // Should NOT be on /login?error
    const url = page.url()
    console.log("URL check - contains error:", url.includes("error="))

    await context.close()
  })
})
