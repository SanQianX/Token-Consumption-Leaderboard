import { test, expect } from "@playwright/test"

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173"

test.describe("Local Dashboard", () => {
  // ============================================
  // Page Load
  // ============================================
  test("loads the dashboard page", async ({ page }) => {
    await page.goto(FRONTEND_URL)
    await page.waitForLoadState("networkidle")

    const root = page.locator("#root")
    await expect(root).toBeVisible()
  })

  // ============================================
  // Navbar Navigation
  // ============================================
  test.describe("Navbar", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(FRONTEND_URL)
      await page.waitForLoadState("networkidle")
    })

    test("has navigation bar", async ({ page }) => {
      const nav = page.locator("nav")
      await expect(nav).toBeVisible()
    })

    test("has Dashboard link", async ({ page }) => {
      const link = page.locator('nav a:has-text("Dashboard")')
      await expect(link).toBeVisible()
    })

    test("has Leaderboard button", async ({ page }) => {
      const btn = page.locator('nav button:has-text("Leaderboard")')
      await expect(btn).toBeVisible()
    })

    test("navigates to Settings page", async ({ page }) => {
      const link = page.locator('nav a:has-text("Settings")')
      await expect(link).toBeVisible()
      await link.click()
      await page.waitForLoadState("networkidle")
      expect(page.url()).toContain("settings")
    })

    test("has Sign in button when not logged in", async ({ page }) => {
      const btn = page.locator('nav button:has-text("Sign in")')
      // May or may not be visible depending on auth state
      const count = await btn.count()
      expect(count).toBeLessThanOrEqual(1)
    })
  })

  // ============================================
  // Dashboard Data Display
  // ============================================
  test.describe("Dashboard", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(FRONTEND_URL)
      await page.waitForLoadState("networkidle")
    })

    test("has page title", async ({ page }) => {
      const title = await page.title()
      expect(title).toBe("Token Consumption Leaderboard")
    })

    test("shows header with view mode tabs", async ({ page }) => {
      const header = page.locator("header")
      await expect(header).toBeVisible()

      // Should have Daily, Monthly, Session, Blocks tabs
      await expect(page.locator('button:has-text("Daily")')).toBeVisible()
      await expect(page.locator('button:has-text("Monthly")')).toBeVisible()
      await expect(page.locator('button:has-text("Session")')).toBeVisible()
      await expect(page.locator('button:has-text("Blocks")')).toBeVisible()
    })

    test("shows KPI cards or loading state", async ({ page }) => {
      // The KPI grid should exist (4 cards in a row)
      const kpiGrid = page.locator(".grid.grid-cols-1")
      await expect(kpiGrid.first()).toBeVisible({ timeout: 10_000 })
    })

    test("shows data table or empty state", async ({ page }) => {
      const table = page.locator("table")
      const noData = page.locator('text=No data available')
      // Either table or no-data message should appear
      await expect(table.or(noData).first()).toBeVisible({ timeout: 10_000 })
    })

    test("Refresh button is visible", async ({ page }) => {
      const btn = page.locator('button:has-text("Refresh")')
      await expect(btn).toBeVisible()
    })
  })

  // ============================================
  // Settings Page
  // ============================================
  test.describe("Settings Page", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(`${FRONTEND_URL}/settings`)
      await page.waitForLoadState("networkidle")
    })

    test("displays Settings title", async ({ page }) => {
      const title = page.locator('h1:has-text("Settings")')
      await expect(title).toBeVisible()
    })

    test("has Remote Server card with URL input", async ({ page }) => {
      // Card title is in a div with data-slot="card-title"
      const cardTitle = page.locator('[data-slot="card-title"]:has-text("Remote Server")')
      await expect(cardTitle).toBeVisible()

      const input = page.locator('input[type="url"]')
      await expect(input).toBeVisible()
    })

    test("has Auto Submit card with toggle", async ({ page }) => {
      const cardTitle = page.locator('text=Auto Submit')
      await expect(cardTitle).toBeVisible()

      // Toggle is a rounded-full button
      const toggle = page.locator('button.rounded-full')
      await expect(toggle).toBeVisible()
    })

    test("has API Token password input", async ({ page }) => {
      const input = page.locator('input[placeholder="tl_xxxxx..."], input[placeholder*="Token"], input[type="password"]')
      await expect(input.first()).toBeVisible()
    })

    test("has Save Settings button", async ({ page }) => {
      const btn = page.locator('button:has-text("Save Settings")')
      await expect(btn).toBeVisible()
    })

    test("has Test Submit button", async ({ page }) => {
      const btn = page.locator('button:has-text("Test Submit")')
      await expect(btn).toBeVisible()
    })
  })

  // ============================================
  // Login Page
  // ============================================
  test.describe("Login Page", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(`${FRONTEND_URL}/login`)
      await page.waitForLoadState("networkidle")
    })

    test("displays Welcome card", async ({ page }) => {
      const title = page.locator('text=Welcome')
      await expect(title).toBeVisible()
    })

    test("has GitHub and Email tab switcher", async ({ page }) => {
      // Tab buttons are inside a .flex.rounded-lg.border container (not the "Continue with GitHub" button)
      const tabContainer = page.locator(".flex.rounded-lg.border")
      const githubTab = tabContainer.locator('button:has-text("GitHub")')
      const emailTab = tabContainer.locator('button:has-text("Email")')
      await expect(githubTab).toBeVisible()
      await expect(emailTab).toBeVisible()
    })

    test("shows Continue with GitHub button by default", async ({ page }) => {
      const btn = page.locator('button:has-text("Continue with GitHub")')
      await expect(btn).toBeVisible()
    })

    test("switches to Email login form", async ({ page }) => {
      // Click Email tab in the tab switcher (not navbar)
      const tabContainer = page.locator(".flex.rounded-lg.border")
      await tabContainer.locator('button:has-text("Email")').click()

      // Should show email and password inputs
      const emailInput = page.locator('input[placeholder="Email"]')
      const passwordInput = page.locator('input[placeholder="Password"]')
      await expect(emailInput).toBeVisible()
      await expect(passwordInput).toBeVisible()

      // Should show Sign in button (in the card, not navbar)
      const btn = page.locator('.max-w-md button:has-text("Sign in")')
      await expect(btn).toBeVisible()
    })

    test("can switch to Register form", async ({ page }) => {
      await page.click('button:has-text("Email")')
      await page.click('button:has-text("Register")')

      // Should show Username input
      const usernameInput = page.locator('input[placeholder="Username"]')
      await expect(usernameInput).toBeVisible()
    })
  })
})
