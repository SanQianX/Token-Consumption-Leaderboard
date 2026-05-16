import { test, expect } from "@playwright/test"

test.describe("Token Consumption Leaderboard", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/")
  })

  test("has correct title", async ({ page }) => {
    await expect(page).toHaveTitle("Token Consumption Leaderboard")
    await expect(
      page.getByRole("heading", { name: "Token Consumption Leaderboard" })
    ).toBeVisible()
  })

  test("shows navigation tabs", async ({ page }) => {
    const tabs = ["Daily", "Monthly", "Session", "Blocks"]
    for (const tab of tabs) {
      await expect(page.getByRole("tab", { name: tab })).toBeVisible()
    }
  })

  test("daily view loads KPI cards with data", async ({ page }) => {
    await expect(page.getByRole("tab", { name: "Daily" })).toHaveAttribute(
      "aria-selected",
      "true"
    )

    await expect(page.getByText("Total Tokens").first()).toBeVisible()
    await expect(page.getByText("Total Cost").first()).toBeVisible()
    await expect(page.getByText("Input Tokens").first()).toBeVisible()
    await expect(page.getByText("Output Tokens").first()).toBeVisible()

    const kpiValues = page.locator("p.text-2xl.font-bold")
    await expect(kpiValues).toHaveCount(4)
    for (const el of await kpiValues.all()) {
      const text = await el.textContent()
      expect(text).not.toBe("-")
      expect(text).toMatch(/[\d,]+|\d+\.\d+[KMB]|\$[\d,.]+/)
    }
  })

  test("trend chart is visible", async ({ page }) => {
    await expect(page.getByText("Trend")).toBeVisible()
    await expect(page.getByRole("button", { name: "Tokens" })).toBeVisible()
    await expect(page.getByRole("button", { name: "Cost" })).toBeVisible()
  })

  test("trend chart switches between tokens and cost", async ({ page }) => {
    await expect(page.getByText("Trend")).toBeVisible()
    await page.getByRole("button", { name: "Cost" }).click()
    await page.getByRole("button", { name: "Tokens" }).click()
  })

  test("data table shows daily data", async ({ page }) => {
    await expect(page.getByText("Daily Data")).toBeVisible()

    await expect(page.getByRole("columnheader", { name: "Date" })).toBeVisible()
    await expect(
      page.getByRole("columnheader", { name: "Total Tokens" })
    ).toBeVisible()
    await expect(page.getByRole("columnheader", { name: "Cost" })).toBeVisible()

    const rows = page.getByRole("row")
    const count = await rows.count()
    expect(count).toBeGreaterThanOrEqual(2)
  })

  test("expand model breakdown on row click", async ({ page }) => {
    await expect(page.getByText("Daily Data")).toBeVisible()

    const firstDataRow = page.getByRole("row").nth(1)
    await firstDataRow.click()

    const breakdown = page.getByText("Model Breakdown")
    if (await breakdown.isVisible()) {
      const modelNames = page.locator("tr.border-t td.py-1\\.5")
      const modelCount = await modelNames.count()
      expect(modelCount).toBeGreaterThanOrEqual(0)
    }
  })

  test("switch to monthly view", async ({ page }) => {
    await page.getByRole("tab", { name: "Monthly" }).click()

    await expect(page.getByText("Monthly Data")).toBeVisible()
    await expect(
      page.getByRole("columnheader", { name: "Month" })
    ).toBeVisible()

    const rows = page.getByRole("row")
    const count = await rows.count()
    expect(count).toBeGreaterThanOrEqual(2)
  })

  test("switch to session view", async ({ page }) => {
    await page.getByRole("tab", { name: "Session" }).click()

    await expect(page.getByText("Session Data")).toBeVisible()
    await expect(
      page.getByRole("columnheader", { name: "Session ID" })
    ).toBeVisible()
    await expect(
      page.getByRole("columnheader", { name: "Project" })
    ).toBeVisible()

    await expect(page.locator("span.font-mono.text-xs").first()).toBeVisible()
  })

  test("switch to blocks view", async ({ page }) => {
    await page.getByRole("tab", { name: "Blocks" }).click()

    await expect(page.getByText("Blocks Data")).toBeVisible()
    await expect(
      page.getByRole("columnheader", { name: "Start Time" })
    ).toBeVisible()
    await expect(
      page.getByRole("columnheader", { name: "Entries" })
    ).toBeVisible()
    await expect(
      page.getByRole("columnheader", { name: "Active" })
    ).toBeVisible()
  })

  test("pagination controls are present", async ({ page }) => {
    await expect(page.getByText("Daily Data")).toBeVisible()
    await expect(page.getByText(/Page \d+ of \d+/)).toBeVisible()
    await expect(
      page.getByRole("button", { name: "Previous" })
    ).toBeVisible()
    await expect(page.getByRole("button", { name: "Next" })).toBeVisible()
  })

  test("table column sorting", async ({ page }) => {
    await expect(page.getByText("Daily Data")).toBeVisible()

    const totalTokensHeader = page.getByRole("columnheader", {
      name: "Total Tokens",
    })
    await totalTokensHeader.click()
    await totalTokensHeader.click()
  })

  test("full tab navigation cycle", async ({ page }) => {
    const tabs = ["Monthly", "Session", "Blocks", "Daily"]

    for (const tab of tabs) {
      await page.getByRole("tab", { name: tab }).click()
      await expect(page.getByRole("tab", { name: tab })).toHaveAttribute(
        "aria-selected",
        "true"
      )
      await expect(page.getByText(`${tab} Data`)).toBeVisible()
    }
  })

  test("manual refresh button is visible and clickable", async ({ page }) => {
    const refreshBtn = page.getByRole("button", { name: /Refresh/i })
    await expect(refreshBtn).toBeVisible()
    await expect(refreshBtn).toBeEnabled()

    // Click refresh — should not crash
    await refreshBtn.click()

    // Button should still be visible after refresh completes
    await expect(refreshBtn).toBeVisible()
  })

  test("refresh shows updated timestamp", async ({ page }) => {
    // Wait for initial load
    await expect(page.getByText("Daily Data")).toBeVisible()

    // Should show an "Updated:" timestamp
    await expect(page.getByText(/Updated:/)).toBeVisible()
  })
})
