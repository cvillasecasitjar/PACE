import { isDiscretionary } from "@pace/shared";
import { prisma } from "../lib/prisma";

/**
 * Personalisation engine — Level 1 (statistical, no ML training required).
 *
 * Learns two things from each user's real transaction history:
 *   1. Their typical DAILY discretionary spend ("fun money" burn rate).
 *   2. Their income CYCLE (when the next recurring income is expected).
 *
 * These two numbers turn the generic "can I afford it?" formula into one that
 * understands irregular income: it's not just "do I have the money", it's
 * "will what's left last until my next income at my usual pace?".
 *
 * See docs/MOTOR_DE_DECISION.md for the maths.
 */

const SPEND_WINDOW_DAYS = 60;
const INCOME_WINDOW_DAYS = 120;

export interface PersonalContext {
  daysUntilNextIncome: number;
  typicalDailySpend: number;
}

/**
 * Average discretionary spend per day over the last 60 days.
 *
 * We divide the total discretionary outflow by the full window length (not
 * just active days) so the rate represents a realistic everyday pace, smoothing
 * out spiky weekends.
 */
export async function getTypicalDailySpend(userId: string): Promise<number> {
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - SPEND_WINDOW_DAYS);

  const txns = await prisma.transaction.findMany({
    where: { userId, amount: { lt: 0 }, date: { gte: since } },
    select: { amount: true, category: true },
  });

  const total = txns
    .filter((t) => isDiscretionary(t.category))
    .reduce((acc, t) => acc + Math.abs(t.amount), 0);

  return round(total / SPEND_WINDOW_DAYS);
}

/**
 * Estimate days until the next recurring income.
 *
 * Strategy: look at positive transactions in the last 120 days, group them by
 * source, keep the ones that recur across ≥2 different months, and pick the
 * largest (the "main" income, e.g. a scholarship). Its median day-of-month is
 * the expected pay day; we project the next occurrence from today.
 *
 * Fallback (no detectable cycle): days remaining until end of month.
 */
export async function getDaysUntilNextIncome(userId: string): Promise<number> {
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - INCOME_WINDOW_DAYS);

  const incomes = await prisma.transaction.findMany({
    where: { userId, amount: { gt: 0 }, date: { gte: since } },
    select: { amount: true, date: true, merchant: true, description: true },
  });

  const groups = new Map<
    string,
    { months: Set<string>; amounts: number[]; days: number[] }
  >();
  for (const t of incomes) {
    const key = (t.merchant || t.description).toLowerCase().trim();
    const g = groups.get(key) ?? { months: new Set(), amounts: [], days: [] };
    g.months.add(t.date.toISOString().slice(0, 7));
    g.amounts.push(t.amount);
    g.days.push(t.date.getUTCDate());
    groups.set(key, g);
  }

  // Keep recurring income sources and pick the one with the biggest median.
  let bestDay: number | null = null;
  let bestAmount = 0;
  for (const g of groups.values()) {
    if (g.months.size < 2) continue;
    const med = median(g.amounts);
    if (med > bestAmount) {
      bestAmount = med;
      bestDay = Math.round(median(g.days));
    }
  }

  if (bestDay !== null) {
    return daysUntilDayOfMonth(bestDay);
  }
  return daysUntilEndOfMonth();
}

export async function getPersonalContext(
  userId: string
): Promise<PersonalContext> {
  const [typicalDailySpend, daysUntilNextIncome] = await Promise.all([
    getTypicalDailySpend(userId),
    getDaysUntilNextIncome(userId),
  ]);
  return { typicalDailySpend, daysUntilNextIncome };
}

/* ----------------------------- date helpers ------------------------------ */

/** Days from today until the next occurrence of a given day-of-month (≥1). */
function daysUntilDayOfMonth(targetDay: number): number {
  const today = new Date();
  const y = today.getUTCFullYear();
  const m = today.getUTCMonth();
  const dom = today.getUTCDate();

  let next: Date;
  if (targetDay > dom) {
    next = new Date(Date.UTC(y, m, targetDay));
  } else {
    // Already passed this month → same day next month (clamped to month length).
    const daysInNextMonth = new Date(Date.UTC(y, m + 2, 0)).getUTCDate();
    next = new Date(Date.UTC(y, m + 1, Math.min(targetDay, daysInNextMonth)));
  }
  const diff = Math.ceil((next.getTime() - startOfToday().getTime()) / 86400000);
  return Math.max(1, diff);
}

function daysUntilEndOfMonth(): number {
  const today = new Date();
  const lastDay = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 0)
  ).getUTCDate();
  return Math.max(1, lastDay - today.getUTCDate());
}

function startOfToday(): Date {
  const t = new Date();
  return new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate()));
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
