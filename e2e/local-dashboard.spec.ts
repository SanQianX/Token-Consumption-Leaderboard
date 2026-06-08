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

    test("does NOT show Settings link (local-only app)", async ({ page }) => {
      const link = page.locator('nav a:has-text("Settings")')
      await expect(link).toHaveCount(0)
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
  // Catch-all redirects (no remote routes in local mode)
  // ============================================
  test.describe("Route isolation", () => {
    test("/settings redirects to home", async ({ page }) => {
      await page.goto(`${FRONTEND_URL}/settings`)
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

    test("/login redirects to home", async ({ page }) => {
      await page.goto(`${FRONTEND_URL}/login`)
      await page.waitForLoadState("networkidle")
      expect(page.url()).toBe(`${FRONTEND_URL}/`)
    })
  })
})
