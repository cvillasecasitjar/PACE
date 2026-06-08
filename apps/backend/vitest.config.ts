import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Runs once before the whole suite: creates a fresh, isolated test DB.
    globalSetup: ["./test/globalSetup.ts"],
    // Environment variables for the test run. Set here (not in .env) so tests
    // never touch your real dev database and are fully reproducible.
    env: {
      NODE_ENV: "test",
      DATABASE_URL: "file:./test.db",
      JWT_SECRET: "test-only-jwt-secret",
      TOKEN_ENCRYPTION_KEY:
        "9f1c2a7b4e8d0f3a6c5b9e2d8a1f4c7b0e3d6a9c2f5b8e1d4a7c0f3b6e9d2a5c",
      BANK_PROVIDER: "mock",
    },
    testTimeout: 30000,
    hookTimeout: 60000,
  },
});
