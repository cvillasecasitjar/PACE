import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";

/**
 * End-to-end integration test. Spins up the real Express app against the test
 * database and walks the full happy path a new user would experience:
 *   register → (guarded routes) → connect bank → dashboard → decision → tx edit
 *
 * This is the test that proves all the layers actually fit together.
 */
const app = createApp();

let token = "";

beforeAll(async () => {
  const res = await request(app)
    .post("/api/auth/register")
    .send({
      email: `tester_${Date.now()}@pace.app`,
      password: "supersecret",
      displayName: "Tester",
    });
  expect(res.status).toBe(201);
  token = res.body.token;
  expect(token).toBeTruthy();
});

const auth = () => ({ Authorization: `Bearer ${token}` });

describe("Auth & guards", () => {
  it("blocks protected routes without a token (401)", async () => {
    const res = await request(app).get("/api/dashboard");
    expect(res.status).toBe(401);
  });

  it("rejects login with wrong password", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "nobody@pace.app", password: "x" });
    expect(res.status).toBe(401);
  });
});

describe("Bank connection → dashboard → decision flow", () => {
  it("starts with no money before connecting a bank", async () => {
    const res = await request(app).get("/api/dashboard").set(auth());
    expect(res.status).toBe(200);
    expect(res.body.currentBalance).toBe(0);
    expect(res.body.recentTransactions).toHaveLength(0);
  });

  it("connects a (mock) bank and imports transactions", async () => {
    const res = await request(app)
      .post("/api/bank/connect")
      .set(auth())
      .send({ institution: "Demo Bank" });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe("connected");
    expect(res.body.imported).toBeGreaterThan(0);
  });

  it("now shows a populated dashboard", async () => {
    const res = await request(app).get("/api/dashboard").set(auth());
    expect(res.status).toBe(200);
    // "Populated" = it has real data. We don't assert a positive balance: the
    // mock generates a random student-like history, so depending on the day of
    // the month the balance can legitimately be in the red.
    expect(typeof res.body.currentBalance).toBe("number");
    expect(res.body.recentTransactions.length).toBeGreaterThan(0);
    expect(["green", "yellow", "red"]).toContain(res.body.status);
    expect(res.body.weeklySpend).toHaveLength(7);
    expect(typeof res.body.plannedThisMonth).toBe("number");
    expect(Array.isArray(res.body.categoryBreakdown)).toBe(true);
    expect(res.body.categoryBreakdown.length).toBeGreaterThan(0);
  });

  it("answers the decision engine with a personalised verdict", async () => {
    const res = await request(app)
      .post("/api/decision")
      .set(auth())
      .send({ amount: 20 });
    expect(res.status).toBe(200);
    expect(["yes", "caution", "no"]).toContain(res.body.verdict);
    expect(res.body.personalized).toBe(true);
    expect(typeof res.body.daysUntilNextIncome).toBe("number");
  });
});

describe("Transactions & categorisation learning", () => {
  it("lists transactions and lets the user correct a category", async () => {
    const list = await request(app).get("/api/transactions").set(auth());
    expect(list.status).toBe(200);
    expect(list.body.length).toBeGreaterThan(0);

    const tx = list.body[0];
    const res = await request(app)
      .patch(`/api/transactions/${tx.id}/category`)
      .set(auth())
      .send({ category: "leisure" });
    expect(res.status).toBe(200);
    expect(res.body.category).toBe("leisure");
    expect(res.body.categoryConfirmed).toBe(true);
  });
});

describe("Budgets", () => {
  it("creates a budget and computes spent", async () => {
    const res = await request(app)
      .put("/api/budgets")
      .set(auth())
      .send({ category: "restaurants", limit: 120 });
    expect(res.status).toBe(200);
    expect(res.body.limit).toBe(120);
    expect(res.body.spent).toBeGreaterThanOrEqual(0);
  });
});
