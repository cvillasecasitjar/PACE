import type { PlannedEvent, PlanStatus, PlanSuggestion, PlanType } from "@pace/shared";
import { getPlanType } from "@pace/shared";
import { prisma } from "../lib/prisma";

/* -------------------------------------------------------------------------- */
/* Date helpers                                                               */
/* -------------------------------------------------------------------------- */

function startOfToday(): Date {
  const t = new Date();
  return new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate()));
}

function endOfMonth(): Date {
  const t = new Date();
  // Day 0 of next month = last day of this month, end of day.
  return new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + 1, 0, 23, 59, 59));
}

/* -------------------------------------------------------------------------- */
/* Mapping                                                                    */
/* -------------------------------------------------------------------------- */

type PlanRow = {
  id: string;
  userId: string;
  title: string;
  type: string;
  date: Date;
  endDate: Date | null;
  estimatedAmount: number;
  actualAmount: number | null;
  status: string;
  matchedTxId: string | null;
  createdAt: Date;
};

function toShared(p: PlanRow): PlannedEvent {
  return {
    id: p.id,
    userId: p.userId,
    title: p.title,
    type: p.type as PlanType,
    date: p.date.toISOString(),
    endDate: p.endDate ? p.endDate.toISOString() : null,
    estimatedAmount: round(p.estimatedAmount),
    actualAmount: p.actualAmount == null ? null : round(p.actualAmount),
    status: p.status as PlanStatus,
    matchedTxId: p.matchedTxId,
    createdAt: p.createdAt.toISOString(),
  };
}

/* -------------------------------------------------------------------------- */
/* CRUD                                                                       */
/* -------------------------------------------------------------------------- */

export async function listPlans(
  userId: string,
  opts: { upcomingOnly?: boolean } = {}
): Promise<PlannedEvent[]> {
  // "Upcoming" includes multi-day plans that are still ongoing (ended >= today).
  const where = opts.upcomingOnly
    ? {
        userId,
        OR: [
          { date: { gte: startOfToday() } },
          { endDate: { gte: startOfToday() } },
        ],
      }
    : { userId };
  const rows = await prisma.plannedEvent.findMany({
    where,
    orderBy: { date: "asc" },
  });
  return rows.map(toShared);
}

export interface CreatePlanInput {
  title?: string;
  type: PlanType;
  date: Date;
  endDate?: Date | null;
  estimatedAmount: number;
}

export async function createPlan(
  userId: string,
  input: CreatePlanInput
): Promise<PlannedEvent> {
  const meta = getPlanType(input.type);
  const row = await prisma.plannedEvent.create({
    data: {
      userId,
      title: input.title?.trim() || meta.label_es,
      type: meta.id,
      date: input.date,
      endDate: normalizeEnd(input.date, input.endDate),
      estimatedAmount: input.estimatedAmount,
      status: "planned",
    },
  });
  return toShared(row);
}

export interface UpdatePlanInput {
  title?: string;
  type?: PlanType;
  date?: Date;
  endDate?: Date | null;
  estimatedAmount?: number;
  actualAmount?: number | null;
  status?: PlanStatus;
}

export async function updatePlan(
  userId: string,
  id: string,
  patch: UpdatePlanInput
): Promise<PlannedEvent | null> {
  // Scope the update to the owner so users can't touch each other's plans.
  const existing = await prisma.plannedEvent.findFirst({ where: { id, userId } });
  if (!existing) return null;
  const startDate = patch.date ?? existing.date;
  const row = await prisma.plannedEvent.update({
    where: { id },
    data: {
      title: patch.title?.trim() || undefined,
      type: patch.type,
      date: patch.date,
      endDate:
        patch.endDate === undefined
          ? undefined
          : normalizeEnd(startDate, patch.endDate),
      estimatedAmount: patch.estimatedAmount,
      actualAmount: patch.actualAmount,
      status: patch.status,
    },
  });
  return toShared(row);
}

/** Drop a meaningless end date (null, or same/earlier than the start). */
function normalizeEnd(start: Date, end?: Date | null): Date | null {
  if (!end) return null;
  return end.getTime() > start.getTime() ? end : null;
}

export async function deletePlan(userId: string, id: string): Promise<boolean> {
  const result = await prisma.plannedEvent.deleteMany({ where: { id, userId } });
  return result.count > 0;
}

/* -------------------------------------------------------------------------- */
/* Totals & learning                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Sum of upcoming planned events for the rest of the current month. These are
 * commitments the user already intends to spend, so the dashboard and the
 * decision engine subtract them from "fun money available".
 */
export async function getUpcomingPlannedThisMonth(userId: string): Promise<number> {
  const today = startOfToday();
  const monthEnd = endOfMonth();
  const rows = await prisma.plannedEvent.findMany({
    where: { userId, status: "planned", date: { lte: monthEnd } },
    select: { estimatedAmount: true, date: true, endDate: true },
  });
  // A plan counts if it hasn't fully passed yet (its last day is today or later).
  const upcoming = rows.filter((r) => (r.endDate ?? r.date).getTime() >= today.getTime());
  return round(upcoming.reduce((acc, r) => acc + r.estimatedAmount, 0));
}

/**
 * Suggest a cost for a plan type, learning from the user's own history:
 *   1. Past plans of this type they actually completed (actualAmount) → median.
 *   2. Otherwise, their average transaction in the mapped category (last 90d).
 *   3. Otherwise, a sensible built-in default.
 * The `basis` tells the UI how confident the number is.
 */
export async function suggestAmountForType(
  userId: string,
  type: PlanType
): Promise<PlanSuggestion> {
  const meta = getPlanType(type);

  const donePlans = await prisma.plannedEvent.findMany({
    where: { userId, type: meta.id, status: "done", actualAmount: { not: null } },
    select: { actualAmount: true },
  });
  const actuals = donePlans
    .map((p) => p.actualAmount as number)
    .filter((n) => n > 0);
  if (actuals.length > 0) {
    return { type: meta.id, suggested: niceRound(median(actuals)), basis: "history" };
  }

  const since = new Date();
  since.setUTCDate(since.getUTCDate() - 90);
  const txns = await prisma.transaction.findMany({
    where: { userId, category: meta.category, amount: { lt: 0 }, date: { gte: since } },
    select: { amount: true },
  });
  if (txns.length > 0) {
    const avg =
      txns.reduce((acc, t) => acc + Math.abs(t.amount), 0) / txns.length;
    return { type: meta.id, suggested: niceRound(avg), basis: "category" };
  }

  return { type: meta.id, suggested: meta.defaultAmount, basis: "default" };
}

/* -------------------------------------------------------------------------- */
/* Auto-reconciliation                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Match still-pending plans whose day has already arrived against real
 * transactions, and mark them "done" with the actual cost. This is what lets
 * estimates learn: you plan a 40€ dinner, the 47€ restaurant charge shows up,
 * and the plan becomes "done = 47€" automatically.
 *
 * Matching rule (deliberately conservative):
 *   - plan is still "planned", its day has passed (date <= now), not yet linked
 *   - a transaction exists in the SAME category as the plan type
 *   - dated within [start − 1 day, end + 2 days]
 *   - not already used to reconcile another plan
 *   - among candidates, pick the amount closest to the estimate
 * Runs after each sync. Returns how many plans were reconciled.
 */
export async function reconcilePlans(userId: string): Promise<number> {
  const now = new Date();
  const pending = await prisma.plannedEvent.findMany({
    where: {
      userId,
      status: "planned",
      matchedTxId: null,
      date: { lte: now },
    },
    orderBy: { date: "asc" },
  });
  if (pending.length === 0) return 0;

  const usedTx = new Set<string>();
  let reconciled = 0;

  for (const plan of pending) {
    const meta = getPlanType(plan.type as PlanType);
    const start = plan.date;
    const end = plan.endDate ?? plan.date;
    const windowStart = new Date(start);
    windowStart.setUTCDate(windowStart.getUTCDate() - 1);
    const windowEnd = new Date(end);
    windowEnd.setUTCDate(windowEnd.getUTCDate() + 2);

    const candidates = await prisma.transaction.findMany({
      where: {
        userId,
        amount: { lt: 0 },
        category: meta.category,
        date: { gte: windowStart, lte: windowEnd },
      },
    });

    const available = candidates
      .filter((c) => !usedTx.has(c.id))
      .sort(
        (a, b) =>
          Math.abs(Math.abs(a.amount) - plan.estimatedAmount) -
          Math.abs(Math.abs(b.amount) - plan.estimatedAmount)
      );

    const match = available[0];
    if (!match) continue;

    usedTx.add(match.id);
    await prisma.plannedEvent.update({
      where: { id: plan.id },
      data: {
        status: "done",
        actualAmount: round(Math.abs(match.amount)),
        matchedTxId: match.id,
      },
    });
    reconciled++;
  }

  return reconciled;
}

/* -------------------------------------------------------------------------- */
/* Maths helpers                                                              */
/* -------------------------------------------------------------------------- */

function median(nums: number[]): number {
  if (nums.length === 0) return 0;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** Round up to the nearest 5 for friendlier-looking estimates. */
function niceRound(n: number): number {
  return Math.max(5, Math.ceil(n / 5) * 5);
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
