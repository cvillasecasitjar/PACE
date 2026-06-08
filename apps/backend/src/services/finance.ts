import type {
  DashboardSummary,
  DecisionResult,
  Transaction as SharedTransaction,
  CategoryId,
} from "@pace/shared";
import {
  CATEGORY_IDS,
  evaluateDecision,
  isDiscretionary,
  statusFor,
} from "@pace/shared";
import { prisma } from "../lib/prisma";
import { getPersonalContext } from "./personalization";
import { getUpcomingPlannedThisMonth } from "./plans";

/**
 * Essential (non-discretionary) expense categories. Money still expected to be
 * spent on these this month must NOT count as "fun money": groceries, rent,
 * transport, subscriptions, bills, health, education. Income/transfers are
 * excluded because they are not spending.
 */
const ESSENTIAL_CATEGORIES = CATEGORY_IDS.filter(
  (c) => !isDiscretionary(c) && c !== "income" && c !== "transfers"
);

/* -------------------------------------------------------------------------- */
/* Recurring-payment detection                                                */
/* -------------------------------------------------------------------------- */

/**
 * Detect genuine recurring commitments (subscriptions, rent, phone, gym) —
 * NOT merely any merchant seen twice. A merchant counts as recurring when:
 *   - it appears in at least 2 distinct months, AND
 *   - it occurs roughly once per month (≈ not 8× like a supermarket), AND
 *   - its amounts are stable (low relative spread).
 *
 * This keeps everyday spend (groceries, eating out) out of the "fixed
 * commitments" figure used by the decision engine (FR-06 / FR-07).
 */
export async function detectAndFlagRecurring(userId: string): Promise<void> {
  const txns = await prisma.transaction.findMany({
    where: { userId, amount: { lt: 0 } },
    select: { id: true, merchant: true, description: true, amount: true, date: true },
  });

  const groups = new Map<
    string,
    { months: Set<string>; ids: string[]; amounts: number[] }
  >();
  for (const t of txns) {
    const key = (t.merchant || t.description).toLowerCase().trim();
    const month = t.date.toISOString().slice(0, 7);
    const g = groups.get(key) ?? { months: new Set(), ids: [], amounts: [] };
    g.months.add(month);
    g.ids.push(t.id);
    g.amounts.push(Math.abs(t.amount));
    groups.set(key, g);
  }

  const recurringIds: string[] = [];
  const nonRecurringIds: string[] = [];
  for (const g of groups.values()) {
    const monthCount = g.months.size;
    const occurrencesPerMonth = g.ids.length / monthCount;
    const isMonthlyCadence = monthCount >= 2 && occurrencesPerMonth <= 1.4;
    const stableAmount = relativeSpread(g.amounts) <= 0.2;
    if (isMonthlyCadence && stableAmount) recurringIds.push(...g.ids);
    else nonRecurringIds.push(...g.ids);
  }

  await prisma.$transaction([
    prisma.transaction.updateMany({
      where: { id: { in: recurringIds } },
      data: { isRecurring: true },
    }),
    prisma.transaction.updateMany({
      where: { id: { in: nonRecurringIds } },
      data: { isRecurring: false },
    }),
  ]);
}

export interface RecurringPayment {
  merchant: string;
  category: CategoryId;
  typicalAmount: number; // positive magnitude
  typicalDayOfMonth: number;
}

/** Summarise detected recurring expenses into one entry per merchant. */
export async function getRecurringPayments(
  userId: string
): Promise<RecurringPayment[]> {
  const txns = await prisma.transaction.findMany({
    where: { userId, isRecurring: true, amount: { lt: 0 } },
    orderBy: { date: "desc" },
  });

  const byMerchant = new Map<
    string,
    { amounts: number[]; days: number[]; category: string; merchant: string }
  >();
  for (const t of txns) {
    const key = (t.merchant || t.description).toLowerCase().trim();
    const entry =
      byMerchant.get(key) ??
      { amounts: [], days: [], category: t.category, merchant: t.merchant || t.description };
    entry.amounts.push(Math.abs(t.amount));
    entry.days.push(t.date.getUTCDate());
    byMerchant.set(key, entry);
  }

  return [...byMerchant.values()].map((e) => ({
    merchant: e.merchant,
    category: e.category as CategoryId,
    typicalAmount: round(median(e.amounts)),
    typicalDayOfMonth: Math.round(median(e.days)),
  }));
}

/**
 * Fixed commitments still expected before the end of the current month:
 * recurring payments whose typical day-of-month hasn't happened yet.
 */
export async function getUpcomingCommitments(userId: string): Promise<number> {
  const recurring = await getRecurringPayments(userId);
  const today = new Date();
  const dom = today.getUTCDate();
  let total = 0;
  for (const r of recurring) {
    if (r.typicalDayOfMonth >= dom) total += r.typicalAmount;
  }
  return round(total);
}

/**
 * Money that must stay reserved for essentials for the rest of the month, so it
 * is excluded from "fun money". For every essential category we take, per
 * category, the LARGER of:
 *   - remaining budget   = max(0, monthly limit − already spent this month)
 *   - upcoming recurring = recurring charges in that category still due
 * Taking the max (instead of the sum) avoids double-counting a budgeted bill
 * that is also detected as recurring. Categories without a budget still reserve
 * their detected recurring charges; budgeted categories reserve what you set.
 */
export async function getReservedEssentials(userId: string): Promise<number> {
  const now = new Date();
  const startOfMonth = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)
  );
  const dom = now.getUTCDate();

  const [budgets, monthTxns, recurring] = await Promise.all([
    prisma.budget.findMany({ where: { userId } }),
    prisma.transaction.findMany({
      where: { userId, amount: { lt: 0 }, date: { gte: startOfMonth } },
      select: { amount: true, category: true },
    }),
    getRecurringPayments(userId),
  ]);

  const spent: Record<string, number> = {};
  for (const t of monthTxns) {
    spent[t.category] = (spent[t.category] ?? 0) + Math.abs(t.amount);
  }

  const limit: Record<string, number> = {};
  for (const b of budgets) limit[b.category] = b.limit;

  const recurringRemaining: Record<string, number> = {};
  for (const r of recurring) {
    if (r.typicalDayOfMonth >= dom) {
      recurringRemaining[r.category] =
        (recurringRemaining[r.category] ?? 0) + r.typicalAmount;
    }
  }

  let total = 0;
  for (const c of ESSENTIAL_CATEGORIES) {
    const remainingBudget =
      limit[c] != null ? Math.max(0, limit[c] - (spent[c] ?? 0)) : 0;
    const remainingRecurring = recurringRemaining[c] ?? 0;
    total += Math.max(remainingBudget, remainingRecurring);
  }
  return round(total);
}

/* -------------------------------------------------------------------------- */
/* Balance, dashboard & decision                                              */
/* -------------------------------------------------------------------------- */

export async function getTotalBalance(userId: string): Promise<{
  balance: number;
  currency: string;
}> {
  const connections = await prisma.bankConnection.findMany({
    where: { userId, isActive: true },
  });
  const balance = connections.reduce((acc, c) => acc + c.balance, 0);
  const currency = connections[0]?.currency ?? "EUR";
  return { balance: round(balance), currency };
}

export async function buildDashboard(userId: string): Promise<DashboardSummary> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const { balance, currency } = await getTotalBalance(userId);
  // Reserve recurring fixed costs AND the remaining budget for essentials
  // (groceries, rent, transport, subscriptions, bills) so none of it is
  // treated as fun money.
  const upcomingCommitments = await getReservedEssentials(userId);
  const plannedThisMonth = await getUpcomingPlannedThisMonth(userId);

  const now = new Date();
  const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 7);

  const monthTxns = await prisma.transaction.findMany({
    where: { userId, date: { gte: startOfMonth } },
    orderBy: { date: "desc" },
  });

  const spentThisMonth = round(
    monthTxns
      .filter((t) => t.amount < 0)
      .reduce((acc, t) => acc + Math.abs(t.amount), 0)
  );
  const spentLast7Days = round(
    monthTxns
      .filter((t) => t.amount < 0 && t.date >= sevenDaysAgo)
      .reduce((acc, t) => acc + Math.abs(t.amount), 0)
  );

  const discretionaryAvailable = round(
    balance - upcomingCommitments - plannedThisMonth - user.safetyBuffer
  );

  const categoryBreakdown = await buildCategoryBreakdown(userId, monthTxns, spentThisMonth);

  const recentTransactions = (
    await prisma.transaction.findMany({
      where: { userId },
      orderBy: { date: "desc" },
      take: 5,
    })
  ).map(toSharedTransaction);

  return {
    currency,
    currentBalance: balance,
    discretionaryAvailable,
    status: statusFor(discretionaryAvailable),
    spentLast7Days,
    spentThisMonth,
    upcomingCommitments,
    plannedThisMonth,
    safetyBuffer: user.safetyBuffer,
    recentTransactions,
    weeklySpend: buildWeeklySpend(monthTxns),
    categoryBreakdown,
  };
}

/** This month's spend grouped by category (sorted high→low), with budgets. */
async function buildCategoryBreakdown(
  userId: string,
  monthTxns: { amount: number; category: string }[],
  totalSpent: number
): Promise<DashboardSummary["categoryBreakdown"]> {
  const budgets = await prisma.budget.findMany({ where: { userId } });
  const limit: Record<string, number> = {};
  for (const b of budgets) limit[b.category] = b.limit;

  const spent: Record<string, number> = {};
  for (const t of monthTxns) {
    // Spending only; skip income and internal transfers.
    if (t.amount >= 0 || t.category === "transfers") continue;
    spent[t.category] = (spent[t.category] ?? 0) + Math.abs(t.amount);
  }

  return Object.entries(spent)
    .map(([category, amount]) => ({
      category: category as CategoryId,
      spent: round(amount),
      budgetLimit: limit[category] ?? null,
      share: totalSpent > 0 ? amount / totalSpent : 0,
    }))
    .sort((a, b) => b.spent - a.spent);
}

export async function runDecision(
  userId: string,
  amount: number
): Promise<DecisionResult> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const { balance, currency } = await getTotalBalance(userId);
  const upcomingCommitments = await getReservedEssentials(userId);
  const plannedUpcoming = await getUpcomingPlannedThisMonth(userId);
  const context = await getPersonalContext(userId);
  return evaluateDecision({
    amount,
    currentBalance: balance,
    upcomingCommitments,
    plannedUpcoming,
    safetyBuffer: user.safetyBuffer,
    currency,
    context,
  });
}

/* -------------------------------------------------------------------------- */
/* helpers                                                                     */
/* -------------------------------------------------------------------------- */

function buildWeeklySpend(
  monthTxns: { amount: number; date: Date }[]
): { date: string; amount: number }[] {
  const days: { date: string; amount: number }[] = [];
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - i);
    const key = d.toISOString().slice(0, 10);
    const amount = monthTxns
      .filter((t) => t.amount < 0 && t.date.toISOString().slice(0, 10) === key)
      .reduce((acc, t) => acc + Math.abs(t.amount), 0);
    days.push({ date: key, amount: round(amount) });
  }
  return days;
}

export function toSharedTransaction(t: {
  id: string;
  userId: string;
  connectionId: string;
  amount: number;
  currency: string;
  description: string;
  merchant: string | null;
  category: string;
  categoryConfirmed: boolean;
  isRecurring: boolean;
  date: Date;
  createdAt: Date;
}): SharedTransaction {
  return {
    id: t.id,
    userId: t.userId,
    connectionId: t.connectionId,
    amount: t.amount,
    currency: t.currency,
    description: t.description,
    merchant: t.merchant,
    category: t.category as CategoryId,
    categoryConfirmed: t.categoryConfirmed,
    isRecurring: t.isRecurring,
    date: t.date.toISOString(),
    createdAt: t.createdAt.toISOString(),
  };
}

// Re-export for callers that need discretionary checks.
export { isDiscretionary };

/** Coefficient-of-variation-like spread; 0 = identical amounts. */
function relativeSpread(nums: number[]): number {
  if (nums.length <= 1) return 0;
  const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
  if (mean === 0) return 0;
  const variance =
    nums.reduce((a, b) => a + (b - mean) ** 2, 0) / nums.length;
  return Math.sqrt(variance) / mean;
}

function median(nums: number[]): number {
  if (nums.length === 0) return 0;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
