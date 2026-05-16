import { test, expect } from "@playwright/test"

const SERVER_URL = process.env.SERVER_URL || "http://124.220.17.38"

// Test credentials — created during remote server setup
const TEST_EMAIL = "e2e-test@test.com"
const TEST_PASSWORD = "test123456"
const TEST_USERNAME = "e2e_tester"

let jwt = ""
let apiToken = ""

test.describe("Server API", () => {
  // ============================================
  // Health Check
  // ============================================
  test("GET /api/health returns ok", async ({ request }) => {
    const res = await request.get(`${SERVER_URL}/api/health`)
    expect(res.ok()).toBe(true)

    const body = await res.json()
    expect(body.status).toBe("ok")
    expect(body.timestamp).toBeDefined()
  })

  // ============================================
  // Register — Validation
  // ============================================
  test.describe("POST /api/auth/register", () => {
    test("rejects missing fields", async ({ request }) => {
      const res = await request.post(`${SERVER_URL}/api/auth/register`, {
        data: { email: "", password: "", username: "" },
      })
      expect(res.status()).toBe(400)

      const body = await res.json()
      expect(body.error).toContain("Missing required fields")
    })

    test("rejects short username", async ({ request }) => {
      const res = await request.post(`${SERVER_URL}/api/auth/register`, {
        data: { email: "a@b.com", password: "123456", username: "a" },
      })
      expect(res.status()).toBe(400)

      const body = await res.json()
      expect(body.error).toContain("Username must be 2-50 characters")
    })

    test("rejects short password", async ({ request }) => {
      const res = await request.post(`${SERVER_URL}/api/auth/register`, {
        data: { email: "a@b.com", password: "12345", username: "testuser" },
      })
      expect(res.status()).toBe(400)

      const body = await res.json()
      expect(body.error).toContain("Password must be at least 6 characters")
    })
  })

  // ============================================
  // Login
  // ============================================
  test.describe("POST /api/auth/login", () => {
    test("rejects missing fields", async ({ request }) => {
      const res = await request.post(`${SERVER_URL}/api/auth/login`, {
        data: { email: "", password: "" },
      })
      expect(res.status()).toBe(400)
    })

    test("rejects wrong credentials", async ({ request }) => {
      const res = await request.post(`${SERVER_URL}/api/auth/login`, {
        data: { email: "nonexistent@test.com", password: "wrongpassword" },
      })
      expect(res.status()).toBe(401)
    })

    test("logs in with test account", async ({ request }) => {
      const res = await request.post(`${SERVER_URL}/api/auth/login`, {
        data: { email: TEST_EMAIL, password: TEST_PASSWORD },
      })
      expect(res.ok()).toBe(true)

      const body = await res.json()
      expect(body.token).toBeDefined()
      expect(body.username).toBe(TEST_USERNAME)

      jwt = body.token
    })
  })

  // ============================================
  // GET /api/auth/me — JWT Auth
  // ============================================
  test("GET /api/auth/me returns user info with JWT", async ({ request }) => {
    // Ensure we have a JWT from login
    if (!jwt) {
      const loginRes = await request.post(`${SERVER_URL}/api/auth/login`, {
        data: { email: TEST_EMAIL, password: TEST_PASSWORD },
      })
      const loginBody = await loginRes.json()
      jwt = loginBody.token
    }

    const res = await request.get(`${SERVER_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${jwt}` },
    })
    expect(res.ok()).toBe(true)

    const body = await res.json()
    expect(body.user).toBeDefined()
    expect(body.user.username).toBe(TEST_USERNAME)
    expect(body.user.email).toBe(TEST_EMAIL)
    expect(body.user.auth_provider).toBeDefined()
    expect(body.profile).toBeDefined()
    expect(body.profile.username).toBe(TEST_USERNAME)
  })

  test("GET /api/auth/me rejects without auth", async ({ request }) => {
    const res = await request.get(`${SERVER_URL}/api/auth/me`)
    expect(res.status()).toBe(401)
  })

  // ============================================
  // POST /api/auth/api-token
  // ============================================
  test("POST /api/auth/api-token generates API token", async ({ request }) => {
    if (!jwt) {
      const loginRes = await request.post(`${SERVER_URL}/api/auth/login`, {
        data: { email: TEST_EMAIL, password: TEST_PASSWORD },
      })
      jwt = (await loginRes.json()).token
    }

    const res = await request.post(`${SERVER_URL}/api/auth/api-token`, {
      headers: { Authorization: `Bearer ${jwt}` },
      data: { name: "e2e-test" },
    })
    expect(res.ok()).toBe(true)

    const body = await res.json()
    expect(body.token).toMatch(/^tl_/)
    expect(body.prefix).toMatch(/^tl_/)
    expect(body.name).toBe("e2e-test")

    apiToken = body.token
  })

  test("POST /api/auth/api-token rejects without auth", async ({ request }) => {
    const res = await request.post(`${SERVER_URL}/api/auth/api-token`, {
      data: { name: "test" },
    })
    expect(res.status()).toBe(401)
  })

  // ============================================
  // POST /api/submit
  // ============================================
  test.describe.serial("POST /api/submit", () => {
    // Use a unique timestamp so each test run has a different payload (avoids duplicate detection across runs)
    const uniquePayload = {
      totals: { totalTokens: 2000, totalCost: 0.10 },
      entries: [{ date: `2026-05-17-${Date.now()}`, tokens: 2000, cost: 0.10 }],
    }

    let submitApiToken = ""

    test("submits data with API token", async ({ request }) => {
      // Login and get API token
      const loginRes = await request.post(`${SERVER_URL}/api/auth/login`, {
        data: { email: TEST_EMAIL, password: TEST_PASSWORD },
      })
      const loginJwt = (await loginRes.json()).token

      const tokenRes = await request.post(`${SERVER_URL}/api/auth/api-token`, {
        headers: { Authorization: `Bearer ${loginJwt}` },
        data: { name: `e2e-submit-${Date.now()}` },
      })
      submitApiToken = (await tokenRes.json()).token

      const res = await request.post(`${SERVER_URL}/api/submit`, {
        headers: { "X-API-Token": submitApiToken },
        data: { type: "daily", payload: uniquePayload },
      })
      expect(res.ok()).toBe(true)

      const body = await res.json()
      expect(body.message).toBe("Submitted successfully")
      expect(body.username).toBe(TEST_USERNAME)
      expect(body.totalTokens).toBe(2000)
      expect(body.totalCost).toBe(0.10)
    })

    test("rejects missing fields", async ({ request }) => {
      const res = await request.post(`${SERVER_URL}/api/submit`, {
        headers: { "X-API-Token": submitApiToken },
        data: {},
      })
      expect(res.status()).toBe(400)
    })

    test("rejects invalid type", async ({ request }) => {
      const res = await request.post(`${SERVER_URL}/api/submit`, {
        headers: { "X-API-Token": submitApiToken },
        data: { type: "invalid", payload: {} },
      })
      expect(res.status()).toBe(400)
    })

    test("rejects without auth", async ({ request }) => {
      const res = await request.post(`${SERVER_URL}/api/submit`, {
        data: { type: "daily", payload: uniquePayload },
      })
      expect(res.status()).toBe(401)
    })

    test("detects duplicate submission", async ({ request }) => {
      // Send the exact same payload as the first submit test
      const res = await request.post(`${SERVER_URL}/api/submit`, {
        headers: { "X-API-Token": submitApiToken },
        data: { type: "daily", payload: uniquePayload },
      })
      expect(res.ok()).toBe(true)

      const body = await res.json()
      expect(body.duplicate).toBe(true)
    })
  })

  // ============================================
  // GET /api/leaderboard
  // ============================================
  test.describe("GET /api/leaderboard", () => {
    test("returns default leaderboard", async ({ request }) => {
      const res = await request.get(`${SERVER_URL}/api/leaderboard`)
      expect(res.ok()).toBe(true)

      const body = await res.json()
      expect(body.entries).toBeInstanceOf(Array)
      expect(body.page).toBe(1)
      expect(body.limit).toBe(50)
      expect(body.totalPages).toBeDefined()
      expect(body.total).toBeDefined()
    })

    test("supports period param", async ({ request }) => {
      for (const period of ["all_time", "30d", "7d", "1d"]) {
        const res = await request.get(`${SERVER_URL}/api/leaderboard?period=${period}`)
        expect(res.ok()).toBe(true)

        const body = await res.json()
        expect(body.entries).toBeInstanceOf(Array)
      }
    })

    test("rejects invalid period", async ({ request }) => {
      const res = await request.get(`${SERVER_URL}/api/leaderboard?period=invalid`)
      expect(res.status()).toBe(400)
    })

    test("supports sort param", async ({ request }) => {
      const res = await request.get(`${SERVER_URL}/api/leaderboard?sort=cost`)
      expect(res.ok()).toBe(true)

      const body = await res.json()
      expect(body.entries).toBeInstanceOf(Array)
    })

    test("supports pagination", async ({ request }) => {
      const res = await request.get(`${SERVER_URL}/api/leaderboard?page=1&limit=10`)
      expect(res.ok()).toBe(true)

      const body = await res.json()
      expect(body.limit).toBe(10)
      expect(body.entries.length).toBeLessThanOrEqual(10)
    })
  })

  // ============================================
  // GET /api/profile/:username
  // ============================================
  test.describe("GET /api/profile/:username", () => {
    test("returns profile for existing user", async ({ request }) => {
      const res = await request.get(`${SERVER_URL}/api/profile/${TEST_USERNAME}`)
      expect(res.ok()).toBe(true)

      const body = await res.json()
      expect(body.profile).toBeDefined()
      expect(body.profile.username).toBe(TEST_USERNAME)
      expect(body.summary).toBeDefined()
    })

    test("returns 404 for unknown user", async ({ request }) => {
      const res = await request.get(`${SERVER_URL}/api/profile/nonexistent_user_xyz`)
      expect(res.status()).toBe(404)
    })
  })

  // ============================================
  // GET /api/profile/:username/data
  // ============================================
  test.describe("GET /api/profile/:username/data", () => {
    test("returns data for valid type", async ({ request }) => {
      const res = await request.get(
        `${SERVER_URL}/api/profile/${TEST_USERNAME}/data?type=daily`
      )
      expect(res.ok()).toBe(true)

      const body = await res.json()
      expect(body).toHaveProperty("data")
      expect(body).toHaveProperty("updatedAt")
    })

    test("rejects missing type param", async ({ request }) => {
      const res = await request.get(
        `${SERVER_URL}/api/profile/${TEST_USERNAME}/data`
      )
      expect(res.status()).toBe(400)
    })

    test("rejects invalid type", async ({ request }) => {
      const res = await request.get(
        `${SERVER_URL}/api/profile/${TEST_USERNAME}/data?type=invalid`
      )
      expect(res.status()).toBe(400)
    })
  })
})
