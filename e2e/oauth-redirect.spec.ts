import { test, expect } from "@playwright/test"

const SERVER_URL = "https://124.220.17.38"

test.describe("OAuth redirect chain", () => {
  test("Step 1: /api/auth/github redirects to GitHub with correct callback URL", async ({ request }) => {
    const resp = await request.get(`${SERVER_URL}/api/auth/github`, {
      maxRedirects: 0,
    })
    expect(resp.status()).toBe(302)
    const location = resp.headers()["location"]
    const redirectUri = new URL(location).searchParams.get("redirect_uri")
    // Should always redirect to the remote server callback, never localhost
    expect(redirectUri).toBe(`${SERVER_URL}/api/auth/github/callback`)
    expect(redirectUri).toContain("https://")
    expect(redirectUri).not.toContain("localhost")
  })

  test("Step 2: OAuth callback redirects to remote frontend, never localhost", async ({ browser }) => {
    const context = await browser.newContext({ ignoreHTTPSErrors: true })
    const page = await context.newPage()

    const redirects: string[] = []
    page.on("request", (req) => {
      const u = req.url()
      if (u.includes("auth") || u.includes("callback")) {
        redirects.push(`${req.method()} ${u}`)
      }
    })

    // Navigate to a simulated callback page with a test token
    // The real callback would redirect to FRONTEND_URL/auth/callback
    await page.goto(`${SERVER_URL}/auth/callback?token=test_token`, {
      waitUntil: "domcontentloaded",
      timeout: 10000,
    })
    await page.waitForTimeout(2000)

    // Should stay on remote server, not redirect to localhost
    expect(page.url()).toContain("124.220.17.38")
    expect(page.url()).not.toContain("localhost")

    await context.close()
  })
})
