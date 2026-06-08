import { test, expect } from "@playwright/test"

// This file is retained for backward compatibility but tests are now covered
// by oauth-redirect.spec.ts. All localhost callback tests have been removed
// since local mode no longer handles OAuth.

test.describe("OAuth debug (deprecated)", () => {
  test.skip("skipped - oauth-debug tests merged into oauth-redirect.spec.ts", () => {})
})
