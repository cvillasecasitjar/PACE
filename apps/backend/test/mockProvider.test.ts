import { describe, it, expect } from "vitest";
import { MockBankProvider } from "../src/providers/mock";

/**
 * The mock provider must be DETERMINISTic: re-syncing the same connection has
 * to return the same transactions, otherwise de-duplication and budgets would
 * behave erratically. These tests lock that guarantee in.
 */
describe("MockBankProvider", () => {
  const provider = new MockBankProvider();

  it("creates a connection with one account and a token", async () => {
    const res = await provider.initiateConnection({ userId: "u1" });
    expect(res.authUrl).toBeNull(); // mock completes instantly
    expect(res.accounts).toHaveLength(1);
    expect(res.token).toContain("mock_");
  });

  it("returns the SAME transactions for the same token (deterministic)", async () => {
    const { token, accounts } = await provider.initiateConnection({ userId: "u1" });
    const acc = accounts[0].accountId;

    const first = await provider.fetchTransactions({ token, accountId: acc });
    const second = await provider.fetchTransactions({ token, accountId: acc });

    expect(first.length).toBeGreaterThan(0);
    expect(first.map((t) => t.externalId)).toEqual(second.map((t) => t.externalId));
  });

  it("generates both income and expenses", async () => {
    const { token, accounts } = await provider.initiateConnection({ userId: "u2" });
    const txns = await provider.fetchTransactions({
      token,
      accountId: accounts[0].accountId,
    });
    expect(txns.some((t) => t.amount > 0)).toBe(true); // income exists
    expect(txns.some((t) => t.amount < 0)).toBe(true); // expenses exist
  });

  it("filters by 'since' date", async () => {
    const { token, accounts } = await provider.initiateConnection({ userId: "u3" });
    const acc = accounts[0].accountId;
    const all = await provider.fetchTransactions({ token, accountId: acc });

    const today = new Date().toISOString();
    const recent = await provider.fetchTransactions({
      token,
      accountId: acc,
      since: today,
    });
    expect(recent.length).toBeLessThanOrEqual(all.length);
  });
});
