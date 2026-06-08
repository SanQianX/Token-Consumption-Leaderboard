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
      name: "local-app",
      testMatch: "local-dashboard.spec.ts",
      use: {
        baseURL: process.env.FRONTEND_URL || "http://localhost:5173",
      },
    },
  ],
})
