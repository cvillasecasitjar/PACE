import type { SpendQueryResult } from "@pace/shared";
import { parseSpendQuery } from "@pace/shared";
import { prisma } from "../lib/prisma";
import { runDecision } from "./finance";

function startOfMonth(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Conversational "Can I?": understand free text, run the decision engine on the
 * parsed amount, and enrich it with how much the user has already spent in that
 * category this month plus any budget left. All numbers come from the same
 * sources as the rest of the app, so the chat answer never contradicts the
 * dashboard.
 */
export async function askSpend(
  userId: string,
  text: string
): Promise<SpendQueryResult> {
  const parsed = parseSpendQuery(text);

  const [monthTxns, budget] = await Promise.all([
    prisma.transaction.findMany({
      where: {
        userId,
        amount: { lt: 0 },
        category: parsed.category,
        date: { gte: startOfMonth() },
      },
      select: { amount: true },
    }),
    prisma.budget.findUnique({
      where: { userId_category: { userId, category: parsed.category } },
    }),
  ]);

  const spentThisMonth = round(
    monthTxns.reduce((acc, t) => acc + Math.abs(t.amount), 0)
  );
  const budgetLimit = budget ? budget.limit : null;
  const budgetRemaining =
    budgetLimit != null ? round(Math.max(0, budgetLimit - spentThisMonth)) : null;

  const decision =
    parsed.amount != null ? await runDecision(userId, parsed.amount) : null;

  return {
    parsed,
    decision,
    category: parsed.category,
    spentThisMonth,
    budgetLimit,
    budgetRemaining,
  };
}
