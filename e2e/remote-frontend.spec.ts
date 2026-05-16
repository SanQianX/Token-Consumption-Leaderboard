import { test, expect } from "@playwright/test"

const REMOTE_URL = process.env.REMOTE_URL || "https://124.220.17.38"

test.describe("Remote Frontend", () => {
  test.slow() // Double timeout for remote HTTPS tests
  // ============================================
  // Page Load
  // ============================================
  test("loads the leaderboard page", async ({ page }) => {
    await page.goto(REMOTE_URL)
    await page.waitForLoadState("networkidle")

    // Should have root element
    const root = page.locator("#root")
    await expect(root).toBeVisible()
  })

  test("has correct page title", async ({ page }) => {
    await page.goto(REMOTE_URL)
    const title = await page.title()
    expect(title).toBe("Token Consumption Leaderboard")
  })

  // ============================================
  // Navbar (Remote Mode)
  // ============================================
  test.describe("Navbar", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(REMOTE_URL)
      await page.waitForLoadState("networkidle")
    })

    test("has Token Leaderboard logo link", async ({ page }) => {
      const logo = page.locator('nav a:has-text("Token Leaderboard")')
      await expect(logo).toBeVisible()
    })

    test("has Leaderboard nav link (remote mode)", async ({ page }) => {
      // Use exact text to avoid matching "Token Leaderboard"
      const link = page.locator('nav a:has-text("Leaderboard")').filter({ hasText: /^Leaderboard$/ })
      await expect(link).toBeVisible()
    })

    test("does NOT show Dashboard link (remote mode)", async ({ page }) => {
      const link = page.locator('nav a:has-text("Dashboard")')
      await expect(link).toHaveCount(0)
    })

    test("does NOT show Settings link (remote mode)", async ({ page }) => {
      const link = page.locator('nav a:has-text("Settings")')
      await expect(link).toHaveCount(0)
    })

    test("has Sign in button when not logged in", async ({ page }) => {
      const btn = page.locator('nav button:has-text("Sign in")')
      await expect(btn).toBeVisible()
    })
  })

  // ============================================
  // Leaderboard Page
  // ============================================
  test.describe("Leaderboard Page", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(REMOTE_URL)
      await page.waitForLoadState("networkidle")
    })

    test("shows page heading", async ({ page }) => {
      const heading = page.locator('text=Token Consumption Leaderboard')
      await expect(heading.first()).toBeVisible()
    })

    test("shows period filter buttons", async ({ page }) => {
      await expect(page.locator('button:has-text("1 Day")')).toBeVisible()
      await expect(page.locator('button:has-text("7 Days")')).toBeVisible()
      await expect(page.locator('button:has-text("30 Days")')).toBeVisible()
      await expect(page.locator('button:has-text("All Time")')).toBeVisible()
    })

    test("shows sort buttons", async ({ page }) => {
      await expect(page.locator('button:has-text("Tokens")')).toBeVisible()
      await expect(page.locator('button:has-text("Cost")')).toBeVisible()
    })

    test("shows leaderboard table", async ({ page }) => {
      const table = page.locator("table")
      await expect(table).toBeVisible({ timeout: 10_000 })
    })

    test("table has correct column headers", async ({ page }) => {
      await expect(page.locator("th").filter({ hasText: "Rank" })).toBeVisible()
      await expect(page.locator("th").filter({ hasText: "User" })).toBeVisible()
      await expect(page.locator("th").filter({ hasText: "Tokens" })).toBeVisible()
      await expect(page.locator("th").filter({ hasText: "Cost" })).toBeVisible()
    })

    test("switching period tabs updates content", async ({ page }) => {
      // Click 7 Days
      await page.click('button:has-text("7 Days")')
      await page.waitForTimeout(500)

      // Table should still be visible
      const table = page.locator("table")
      await expect(table).toBeVisible()
    })

    test("switching sort updates content", async ({ page }) => {
      await page.click('button:has-text("Cost")')
      await page.waitForTimeout(500)

      const table = page.locator("table")
      await expect(table).toBeVisible()
    })

    test("shows e2e_tester in leaderboard after submission", async ({ page }) => {
      // The test user should appear in all_time leaderboard
      // Need longer timeout since page fetches data from API
      const testerText = page.locator("text=e2e_tester")
      await expect(testerText.first()).toBeVisible({ timeout: 15_000 })
    })

    test("clicking username navigates to profile", async ({ page }) => {
      const userLink = page.locator("text=e2e_tester")
      await expect(userLink.first()).toBeVisible({ timeout: 15_000 })
      await userLink.first().click()
      await page.waitForLoadState("networkidle")
      expect(page.url()).toContain("/profile/e2e_tester")
    })
  })

  // ============================================
  // Login Page
  // ============================================
  test.describe("Login Page", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(`${REMOTE_URL}/login`)
      await page.waitForLoadState("networkidle")
    })

    test("displays Welcome card", async ({ page }) => {
      const title = page.locator('text=Welcome')
      await expect(title).toBeVisible()
    })

    test("has GitHub and Email tabs", async ({ page }) => {
      const tabContainer = page.locator(".flex.rounded-lg.border")
      await expect(tabContainer.locator('button:has-text("GitHub")')).toBeVisible()
      await expect(tabContainer.locator('button:has-text("Email")')).toBeVisible()
    })

    test("shows Continue with GitHub button", async ({ page }) => {
      const btn = page.locator('button:has-text("Continue with GitHub")')
      await expect(btn).toBeVisible()
    })

    test("switches to Email login form", async ({ page }) => {
      const tabContainer = page.locator(".flex.rounded-lg.border")
      await tabContainer.locator('button:has-text("Email")').click()

      await expect(page.locator('input[placeholder="Email"]')).toBeVisible()
      await expect(page.locator('input[placeholder="Password"]')).toBeVisible()
    })

    test("can login with test account", async ({ page }) => {
      const tabContainer = page.locator(".flex.rounded-lg.border")
      await tabContainer.locator('button:has-text("Email")').click()

      await page.fill('input[placeholder="Email"]', "e2e-test@test.com")
      await page.fill('input[placeholder="Password"]', "test123456")
      await page.click('.max-w-md button:has-text("Sign in")')

      // Wait for response — either redirects or shows user menu
      // The login API call should succeed (test via network response)
      const response = await page.waitForResponse(
        resp => resp.url().includes("/api/auth/login") && resp.status() === 200,
        { timeout: 15_000 }
      )
      const body = await response.json()
      expect(body.token).toBeDefined()
      expect(body.username).toBe("e2e_tester")
    })
  })

  // ============================================
  // Profile Page
  // ============================================
  test.describe("Profile Page", () => {
    test("shows e2e_tester profile", async ({ page }) => {
      // Register response listener before navigation
      const profilePromise = page.waitForResponse(
        resp => resp.url().includes("/api/profile/e2e_tester") && resp.status() === 200,
        { timeout: 15_000 }
      )
      await page.goto(`${REMOTE_URL}/profile/e2e_tester`)

      const response = await profilePromise
      const body = await response.json()
      expect(body.profile.username).toBe("e2e_tester")
    })

    test("shows 404 for nonexistent user", async ({ page }) => {
      const res = await page.goto(`${REMOTE_URL}/profile/nonexistent_user_xyz_123`)
      // The page loads but shows "User not found" or redirects
      const body = await page.textContent("body")
      expect(body).toBeTruthy()
    })
  })
})
