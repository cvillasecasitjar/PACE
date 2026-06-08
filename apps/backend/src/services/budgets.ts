import type { Budget, CategoryId } from "@pace/shared";
import { prisma } from "../lib/prisma";

function currentPeriod(): string {
  return new Date().toISOString().slice(0, 7); // YYYY-MM
}

function startOfMonth(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

/** Spend per category for the current month. */
async function spentByCategory(userId: string): Promise<Record<string, number>> {
  const txns = await prisma.transaction.findMany({
    where: { userId, amount: { lt: 0 }, date: { gte: startOfMonth() } },
    select: { category: true, amount: true },
  });
  const out: Record<string, number> = {};
  for (const t of txns) {
    out[t.category] = (out[t.category] ?? 0) + Math.abs(t.amount);
  }
  return out;
}

export async function listBudgets(userId: string): Promise<Budget[]> {
  const [budgets, spent] = await Promise.all([
    prisma.budget.findMany({ where: { userId } }),
    spentByCategory(userId),
  ]);
  const period = currentPeriod();
  return budgets.map((b) => ({
    id: b.id,
    userId: b.userId,
    category: b.category as CategoryId,
    limit: b.limit,
    spent: round(spent[b.category] ?? 0),
    period,
  }));
}

export async function upsertBudget(
  userId: string,
  category: CategoryId,
  limit: number
): Promise<Budget> {
  const b = await prisma.budget.upsert({
    where: { userId_category: { userId, category } },
    create: { userId, category, limit },
    update: { limit },
  });
  const spent = await spentByCategory(userId);
  return {
    id: b.id,
    userId: b.userId,
    category: b.category as CategoryId,
    limit: b.limit,
    spent: round(spent[b.category] ?? 0),
    period: currentPeriod(),
  };
}

export async function deleteBudget(
  userId: string,
  category: CategoryId
): Promise<void> {
  await prisma.budget
    .delete({ where: { userId_category: { userId, category } } })
    .catch(() => undefined);
}

/**
 * Suggest budgets from history (FR-05): average monthly spend per category
 * over the available history, rounded up to a friendly figure.
 */
export async function suggestBudgets(
  userId: string
): Promise<{ category: CategoryId; suggested: number }[]> {
  const txns = await prisma.transaction.findMany({
    where: { userId, amount: { lt: 0 } },
    select: { category: true, amount: true, date: true },
  });
  if (txns.length === 0) return [];

  const months = new Set(txns.map((t) => t.date.toISOString().slice(0, 7)));
  const monthCount = Math.max(1, months.size);

  const totals: Record<string, number> = {};
  for (const t of txns) {
    totals[t.category] = (totals[t.category] ?? 0) + Math.abs(t.amount);
  }

  return Object.entries(totals)
    .map(([category, total]) => ({
      category: category as CategoryId,
      suggested: niceRound(total / monthCount),
    }))
    .filter((s) => s.suggested > 0)
    .sort((a, b) => b.suggested - a.suggested);
}

function niceRound(n: number): number {
  // Round up to nearest 10 to give a little headroom.
  return Math.ceil(n / 10) * 10;
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
