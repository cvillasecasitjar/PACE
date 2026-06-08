import { execSync } from "child_process";
import { rmSync } from "fs";
import path from "path";

/**
 * Vitest global setup. Builds a throwaway SQLite database (prisma/test.db) with
 * the current schema before any test runs, so integration tests hit a clean,
 * isolated DB instead of your dev data.
 */
export default function setup() {
  const dbPath = path.resolve(__dirname, "../prisma/test.db");
  // Start from scratch each run.
  try {
    rmSync(dbPath, { force: true });
  } catch {
    /* ignore */
  }

  execSync("npx prisma db push --skip-generate --accept-data-loss", {
    cwd: path.resolve(__dirname, ".."),
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: "file:./test.db" },
  });
}
