import { test, expect } from "@playwright/test"

const LOCAL_URL = process.env.LOCAL_URL || "http://localhost:3001"

test.describe.serial("Settings API", () => {
  // ============================================
  // GET /api/settings
  // ============================================
  test("GET /api/settings returns default settings", async ({ request }) => {
    const res = await request.get(`${LOCAL_URL}/api/settings`)
    expect(res.ok()).toBe(true)

    const body = await res.json()
    expect(body).toHaveProperty("serverUrl")
    expect(body).toHaveProperty("submitIntervalMinutes")
    expect(body).toHaveProperty("autoSubmitEnabled")
    expect(body).toHaveProperty("apiToken")
    expect(body).toHaveProperty("_hasApiToken")

    // Default values
    expect(body.serverUrl).toBe("http://124.220.17.38")
    expect(body.submitIntervalMinutes).toBe(30)
    expect(body.autoSubmitEnabled).toBe(false)
  })

  // ============================================
  // PUT /api/settings
  // ============================================
  test("PUT /api/settings saves settings", async ({ request }) => {
    const newSettings = {
      serverUrl: "http://test-server.example.com",
      submitIntervalMinutes: 60,
      autoSubmitEnabled: false,
    }

    const res = await request.put(`${LOCAL_URL}/api/settings`, {
      data: newSettings,
    })
    expect(res.ok()).toBe(true)

    const body = await res.json()
    expect(body.message).toBe("Settings saved")

    // Verify the settings were saved
    const getRes = await request.get(`${LOCAL_URL}/api/settings`)
    const saved = await getRes.json()
    expect(saved.serverUrl).toBe("http://test-server.example.com")
    expect(saved.submitIntervalMinutes).toBe(60)
  })

  test("PUT /api/settings preserves unset fields", async ({ request }) => {
    // Save known state first
    await request.put(`${LOCAL_URL}/api/settings`, {
      data: {
        serverUrl: "http://preserve-test.example.com",
        submitIntervalMinutes: 45,
        autoSubmitEnabled: false,
      },
    })

    // Update only one field
    await request.put(`${LOCAL_URL}/api/settings`, {
      data: { submitIntervalMinutes: 15 },
    })

    // Verify other fields preserved
    const getRes = await request.get(`${LOCAL_URL}/api/settings`)
    const saved = await getRes.json()
    expect(saved.serverUrl).toBe("http://preserve-test.example.com")
    expect(saved.submitIntervalMinutes).toBe(15)
  })

  // Cleanup: restore defaults
  test.afterAll(async ({ request }) => {
    await request.put(`${LOCAL_URL}/api/settings`, {
      data: {
        serverUrl: "http://124.220.17.38",
        apiToken: "",
        submitIntervalMinutes: 30,
        autoSubmitEnabled: false,
      },
    })
  })
})
