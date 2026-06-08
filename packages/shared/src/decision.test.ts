import { describe, it, expect } from "vitest";
import { evaluateDecision, statusFor } from "./decision";

/**
 * Tests for the pure decision engine. No database, no network — just maths,
 * which is exactly why this logic lives in `shared`. These are the most
 * valuable tests in the project: they pin down the brain of Pace.
 */

const base = {
  currentBalance: 500,
  upcomingCommitments: 100,
  safetyBuffer: 100,
  currency: "EUR",
};
// discretionaryAvailable = 500 - 100 - 100 = 300

describe("evaluateDecision — Level 0 (no personalisation)", () => {
  it("says YES when there is comfortable room", () => {
    const r = evaluateDecision({ ...base, amount: 50 });
    expect(r.discretionaryAvailable).toBe(300);
    expect(r.remainingAfter).toBe(250);
    expect(r.verdict).toBe("yes");
    expect(r.personalized).toBe(false);
  });

  it("says CAUTION when the purchase leaves you tight", () => {
    // remaining = 300 - 290 = 10, below the caution band (15% of 300 = 45)
    const r = evaluateDecision({ ...base, amount: 290 });
    expect(r.verdict).toBe("caution");
  });

  it("says NO when it pushes past the safety buffer", () => {
    const r = evaluateDecision({ ...base, amount: 350 });
    expect(r.remainingAfter).toBeLessThan(0);
    expect(r.verdict).toBe("no");
  });

  it("exposes the breakdown numbers used by the UI", () => {
    const r = evaluateDecision({ ...base, amount: 100 });
    expect(r.currentBalance).toBe(500);
    expect(r.upcomingCommitments).toBe(100);
    expect(r.safetyBuffer).toBe(100);
    expect(r.i18n.key).toBe("decision.yes");
  });
});

describe("evaluateDecision — Level 1 (income-cycle aware)", () => {
  it("is STRICTER than Level 0: same amount can become CAUTION", () => {
    // Level 0 would say YES (remaining 250 > 45). But at 15€/day for 20 days
    // you'd need 300 to reach the next income, so 250 left is not enough.
    const r = evaluateDecision({
      ...base,
      amount: 50,
      context: { daysUntilNextIncome: 20, typicalDailySpend: 15 },
    });
    expect(r.personalized).toBe(true);
    expect(r.verdict).toBe("caution");
    expect(r.typicalDailySpend).toBe(15);
    expect(r.daysUntilNextIncome).toBe(20);
  });

  it("says YES when income is near, even spending a lot", () => {
    // Income in 2 days → projected need = 15 * 2 = 30. Remaining 250 >> 30.
    const r = evaluateDecision({
      ...base,
      amount: 50,
      context: { daysUntilNextIncome: 2, typicalDailySpend: 15 },
    });
    expect(r.verdict).toBe("yes");
  });

  it("computes the daily allowance left after the purchase", () => {
    const r = evaluateDecision({
      ...base,
      amount: 100, // remaining = 200
      context: { daysUntilNextIncome: 10, typicalDailySpend: 5 },
    });
    expect(r.dailyAllowanceAfter).toBe(20); // 200 / 10
  });

  it("still says NO if you go below the buffer, regardless of cycle", () => {
    const r = evaluateDecision({
      ...base,
      amount: 400,
      context: { daysUntilNextIncome: 1, typicalDailySpend: 5 },
    });
    expect(r.verdict).toBe("no");
  });
});

describe("evaluateDecision — planned events (Calendar)", () => {
  it("subtracts upcoming planned spend from what's available", () => {
    // discretionary = 500 - 100 - 100(planned) - 100(buffer) = 200
    const r = evaluateDecision({ ...base, amount: 0, plannedUpcoming: 100 });
    expect(r.plannedThisMonth).toBe(100);
    expect(r.discretionaryAvailable).toBe(200);
  });

  it("can flip a YES into a NO once plans are accounted for", () => {
    // Without plans: discretionary 300, spending 250 → YES.
    expect(evaluateDecision({ ...base, amount: 250 }).verdict).toBe("yes");
    // With 200 of plans: discretionary 100, spending 250 → NO.
    const r = evaluateDecision({ ...base, amount: 250, plannedUpcoming: 200 });
    expect(r.verdict).toBe("no");
  });

  it("defaults planned to 0 when not provided", () => {
    expect(evaluateDecision({ ...base, amount: 0 }).plannedThisMonth).toBe(0);
  });
});

describe("statusFor — dashboard traffic light", () => {
  it("is red when there is nothing discretionary left", () => {
    expect(statusFor(0)).toBe("red");
    expect(statusFor(-20)).toBe("red");
  });
  it("is yellow when low", () => {
    expect(statusFor(30)).toBe("yellow");
  });
  it("is green when healthy", () => {
    expect(statusFor(200)).toBe("green");
  });
});
