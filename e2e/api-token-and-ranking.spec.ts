import { test, expect } from "@playwright/test"

const SERVER_URL = process.env.SERVER_URL || "https://124.220.17.38"
const LOCAL_URL = process.env.FRONTEND_URL || "http://localhost:5173"

// Valid JWT for e2e_tester user (signed with server JWT_SECRET)
const E2E_JWT = process.env.E2E_JWT || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJjM2RmMDM5ZC01MjgwLTQ5NjktOWFhMS0zYTMyZTRjODBjMDciLCJ1c2VybmFtZSI6ImUyZV90ZXN0ZXIiLCJpYXQiOjE3NzkxMzIyMzUsImV4cCI6MTc3OTIxODYzNX0.3njUIQs8iCn90HhgpWMhsV5NuiQsEPIwduRuMSOq4Mg"

test.describe.serial("API Token & Leaderboard Ranking", () => {
  // ============================================
  // Server API: One user one token
  // ============================================
  test("Server: POST /api/auth/api-token replaces old token", async ({ request }) => {
    // Generate first token
    const res1 = await request.post(`${SERVER_URL}/api/auth/api-token`, {
      headers: {
        Authorization: `Bearer ${E2E_JWT}`,
        "Content-Type": "application/json",
      },
      data: {},
    })
    expect(res1.ok()).toBe(true)
    const data1 = await res1.json()
    expect(data1.token).toMatch(/^tl_/)

    // Generate second token (should replace first)
    const res2 = await request.post(`${SERVER_URL}/api/auth/api-token`, {
      headers: {
        Authorization: `Bearer ${E2E_JWT}`,
        "Content-Type": "application/json",
      },
      data: {},
    })
    expect(res2.ok()).toBe(true)
    const data2 = await res2.json()
    expect(data2.token).toMatch(/^tl_/)

    // Second token should be different from first
    expect(data2.token).not.toBe(data1.token)

    // Second token should work for submit
    const submitRes = await request.post(`${SERVER_URL}/api/submit`, {
      headers: {
        "Content-Type": "application/json",
        "X-API-Token": data2.token,
      },
      data: {
        type: "daily",
        payload: {
          daily: [{ date: "2026-01-01", totalTokens: 100, totalCost: 0.01 }],
          totals: { totalTokens: 100, totalCost: 0.01 },
        },
      },
    })
    expect(submitRes.ok()).toBe(true)

    // First token should no longer work
    const submitRes2 = await request.post(`${SERVER_URL}/api/submit`, {
      headers: {
        "Content-Type": "application/json",
        "X-API-Token": data1.token,
      },
      data: {
        type: "daily",
        payload: {
          daily: [{ date: "2026-01-02", totalTokens: 200, totalCost: 0.02 }],
          totals: { totalTokens: 200, totalCost: 0.02 },
        },
      },
    })
    expect(submitRes2.status()).toBe(401)
  })

  // ============================================
  // Server API: Leaderboard returns myRank
  // ============================================
  test("Server: GET /api/leaderboard returns myRank for known user", async ({ request }) => {
    const res = await request.get(`${SERVER_URL}/api/leaderboard?period=all_time&username=e2e_tester`)
    expect(res.ok()).toBe(true)
    const data = await res.json()
    expect(data).toHaveProperty("entries")
    expect(data).toHaveProperty("myRank")
    expect(data).toHaveProperty("totalPages")
    // e2e_tester has submitted data, should have a rank
    if (data.total > 0) {
      expect(data.myRank).not.toBeNull()
      expect(data.myRank.username).toBe("e2e_tester")
    }
  })

  test("Server: GET /api/leaderboard without username returns null myRank", async ({ request }) => {
    const res = await request.get(`${SERVER_URL}/api/leaderboard`)
    expect(res.ok()).toBe(true)
    const data = await res.json()
    expect(data.myRank).toBeNull()
  })

  test("Server: GET /api/leaderboard with unknown username returns null myRank", async ({ request }) => {
    const res = await request.get(`${SERVER_URL}/api/leaderboard?username=nonexistent_user_xyz`)
    expect(res.ok()).toBe(true)
    const data = await res.json()
    expect(data.myRank).toBeNull()
  })

  // ============================================
  // Frontend: Settings page Generate Token button
  // ============================================
  test("Frontend: Settings page shows Generate Token when logged in", async ({ browser }) => {
    const context = await browser.newContext()
    const page = await context.newPage()

    // Set auth token to simulate logged-in state
    await page.goto(LOCAL_URL)
    await page.evaluate((token) => {
      localStorage.setItem("auth_token", token)
    }, E2E_JWT)

    await page.goto(`${LOCAL_URL}/settings`)
    await page.waitForLoadState("domcontentloaded")
    await page.waitForTimeout(1000)

    // Should see Generate button (not disabled)
    const generateBtn = page.getByRole("button", { name: /generate/i })
    await expect(generateBtn).toBeVisible()
    await expect(generateBtn).toBeEnabled()

    await context.close()
  })

  test("Frontend: Settings page shows login prompt when not logged in", async ({ browser }) => {
    const context = await browser.newContext()
    const page = await context.newPage()

    await page.goto(`${LOCAL_URL}/settings`)
    await page.waitForLoadState("domcontentloaded")
    await page.waitForTimeout(1000)

    // Should see login prompt
    const prompt = page.getByText(/please log in/i)
    await expect(prompt).toBeVisible()

    // Generate button should be disabled
    const generateBtn = page.getByRole("button", { name: /generate/i })
    await expect(generateBtn).toBeDisabled()

    await context.close()
  })

  // ============================================
  // Frontend: Leaderboard page shows personal rank
  // ============================================
  test("Frontend: Leaderboard page shows Your Ranking card when logged in", async ({ browser }) => {
    const context = await browser.newContext()
    const page = await context.newPage()

    // Set auth token
    await page.goto(LOCAL_URL)
    await page.evaluate((token) => {
      localStorage.setItem("auth_token", token)
    }, E2E_JWT)

    await page.goto(`${LOCAL_URL}/leaderboard`)
    await page.waitForLoadState("domcontentloaded")
    await page.waitForTimeout(3000)

    // Should see "Your Ranking" card (CardTitle renders as <div>, not heading)
    const yourRanking = page.locator('[data-slot="card-title"]:has-text("Your Ranking")')
    await expect(yourRanking).toBeVisible({ timeout: 10000 })

    await context.close()
  })

  test("Frontend: Leaderboard page does not show Your Ranking when not logged in", async ({ browser }) => {
    const context = await browser.newContext()
    const page = await context.newPage()

    await page.goto(`${LOCAL_URL}/leaderboard`)
    // Ensure no auth token
    await page.evaluate(() => localStorage.removeItem("auth_token"))
    await page.reload()
    await page.waitForLoadState("domcontentloaded")
    await page.waitForTimeout(2000)

    // Should NOT see "Your Ranking" card
    const yourRanking = page.locator('[data-slot="card-title"]:has-text("Your Ranking")')
    await expect(yourRanking).not.toBeVisible()

    // Should see login prompt
    const loginPrompt = page.getByText(/log in/i)
    await expect(loginPrompt).toBeVisible()

    await context.close()
  })
})
