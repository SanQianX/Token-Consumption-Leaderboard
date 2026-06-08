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
    await page.screenshot({ path: "screenshots/dashboard-loaded.png", fullPage: true })
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

    test("navigates to Settings page", async ({ page }) => {
      const link = page.locator('nav a:has-text("Settings")')
      await expect(link).toBeVisible()
      await link.click()
      await page.waitForLoadState("networkidle")
      expect(page.url()).toContain("settings")
    })

    test("does NOT show Sign in button in local mode", async ({ page }) => {
      const btn = page.locator('nav button:has-text("Sign in")')
      await expect(btn).toHaveCount(0)
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

      await expect(page.locator('button:has-text("Daily")')).toBeVisible()
      await expect(page.locator('button:has-text("Monthly")')).toBeVisible()
      await expect(page.locator('button:has-text("All Time")')).toBeVisible()
    })

    test("shows KPI cards or loading state", async ({ page }) => {
      const kpiGrid = page.locator(".grid.grid-cols-1")
      await expect(kpiGrid.first()).toBeVisible({ timeout: 10_000 })
      await page.screenshot({ path: "screenshots/dashboard-data.png", fullPage: true })
    })

    test("shows data table or empty state", async ({ page }) => {
      const table = page.locator("table")
      const noData = page.locator('text=No data available')
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

    test("has TokenRank Cloud card with URL input", async ({ page }) => {
      const cardTitle = page.locator('[data-slot="card-title"]:has-text("TokenRank Cloud")')
      await expect(cardTitle).toBeVisible()

      const input = page.locator('input[type="url"]')
      await expect(input).toBeVisible()
    })

    test("has API Token input (paste, no generate in local mode)", async ({ page }) => {
      // In local mode, there's no Generate button — user pastes token
      const input = page.locator('input[placeholder="tl_xxxxx..."], input[placeholder*="Token"], input[type="password"]')
      await expect(input.first()).toBeVisible()

      // No Generate button in local mode
      const generateBtn = page.getByRole("button", { name: /generate/i })
      await expect(generateBtn).toHaveCount(0)
    })

    test("has link to TokenRank Cloud login", async ({ page }) => {
      const link = page.locator('a:has-text("Log in to TokenRank Cloud")')
      await expect(link).toBeVisible()
      expect(await link.getAttribute("target")).toBe("_blank")
    })

    test("has Auto Submit card with toggle", async ({ page }) => {
      const cardTitle = page.locator('text=Auto Submit')
      await expect(cardTitle).toBeVisible()
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
  // Remote routes not accessible in local mode
  // ============================================
  test.describe("Remote route isolation", () => {
    test("/login redirects to home", async ({ page }) => {
      await page.goto(`${FRONTEND_URL}/login`)
      await page.waitForLoadState("networkidle")
      expect(page.url()).toBe(`${FRONTEND_URL}/`)
    })

    test("/leaderboard redirects to home", async ({ page }) => {
      await page.goto(`${FRONTEND_URL}/leaderboard`)
      await page.waitForLoadState("networkidle")
      expect(page.url()).toBe(`${FRONTEND_URL}/`)
    })

    test("/admin redirects to home", async ({ page }) => {
      await page.goto(`${FRONTEND_URL}/admin`)
      await page.waitForLoadState("networkidle")
      expect(page.url()).toBe(`${FRONTEND_URL}/`)
    })

    test("/auth/callback redirects to home", async ({ page }) => {
      await page.goto(`${FRONTEND_URL}/auth/callback?token=test`)
      await page.waitForLoadState("networkidle")
      expect(page.url()).toBe(`${FRONTEND_URL}/`)
    })
  })
})
