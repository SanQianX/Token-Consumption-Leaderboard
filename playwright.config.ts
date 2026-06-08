import { defineConfig } from "@playwright/test"

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  timeout: 30_000,

  projects: [
    {
      name: "server-api",
      testMatch: "server-api.spec.ts",
      use: {
        baseURL: process.env.SERVER_URL || "https://124.220.17.38",
        ignoreHTTPSErrors: true,
      },
    },
    {
      name: "remote-frontend",
      testMatch: "remote-frontend.spec.ts",
      use: {
        baseURL: process.env.REMOTE_URL || "https://124.220.17.38",
        ignoreHTTPSErrors: true,
      },
    },
    {
      name: "local-app",
      testMatch: "local-dashboard.spec.ts",
      use: {
        baseURL: process.env.FRONTEND_URL || "http://localhost:5173",
      },
    },
    {
      name: "settings-api",
      testMatch: "settings-api.spec.ts",
      use: {
        baseURL: process.env.LOCAL_URL || "http://localhost:3001",
      },
    },
    {
      name: "oauth-redirect",
      testMatch: "oauth-redirect.spec.ts",
      use: {
        ignoreHTTPSErrors: true,
      },
    },
    {
      name: "api-token-and-ranking",
      testMatch: "api-token-and-ranking.spec.ts",
      use: {
        ignoreHTTPSErrors: true,
      },
    },
  ],
})
