import type { DecisionResult, DecisionVerdict } from "./types";

export interface DecisionInputs {
  amount: number;
  currentBalance: number;
  upcomingCommitments: number;
  /**
   * Sum of upcoming planned events (the Calendar) still to come this month.
   * Treated like a soft commitment: money the user already intends to spend,
   * so it shouldn't be counted as freely available. Defaults to 0.
   */
  plannedUpcoming?: number;
  safetyBuffer: number;
  currency: string;
  /**
   * Optional personalisation context (Level 1). When provided, the verdict
   * becomes income-cycle aware instead of a flat threshold: it checks whether
   * what's left after the purchase can realistically last until the next
   * income at the user's typical daily spend.
   */
  context?: {
    /** Days until the next expected recurring income. */
    daysUntilNextIncome: number;
    /** Average discretionary spend per day, learned from history. */
    typicalDailySpend: number;
  };
}

/**
 * Pure, framework-agnostic core of the "Can I afford this?" engine.
 *
 * The discretionary amount is what the user can spend on extras without
 * touching their safety buffer once this month's known fixed commitments
 * are accounted for:
 *
 *   discretionary = balance − upcomingCommitments − safetyBuffer
 *
 * We then grade the requested amount against that figure, leaving a small
 * "caution band" so we can warn before the user goes negative.
 */
export function evaluateDecision(inputs: DecisionInputs): DecisionResult {
  const { amount, currentBalance, upcomingCommitments, safetyBuffer, currency } =
    inputs;
  const plannedUpcoming = inputs.plannedUpcoming ?? 0;

  const discretionaryAvailable = round(
    currentBalance - upcomingCommitments - plannedUpcoming - safetyBuffer
  );
  const remainingAfter = round(discretionaryAvailable - amount);

  // ---- Personalisation (Level 1) ----------------------------------------
  // If we know the user's income cycle and daily burn rate, the "caution"
  // threshold becomes "can what's left survive until the next income at your
  // usual pace?" instead of a flat percentage. This is what makes Pace work
  // for irregular income.
  const ctx = inputs.context;
  const personalized =
    !!ctx && ctx.daysUntilNextIncome > 0 && ctx.typicalDailySpend >= 0;

  // What you'd realistically need to reach the next income at your usual pace.
  const projectedNeed = personalized
    ? round(ctx!.typicalDailySpend * ctx!.daysUntilNextIncome)
    : 0;

  // Fallback caution band (15% of discretionary, min €10) when not personalised.
  const cautionBand = Math.max(10, discretionaryAvailable * 0.15);

  let verdict: DecisionVerdict;
  let i18nKey: string;

  if (remainingAfter < 0) {
    verdict = "no";
    i18nKey = "decision.no";
  } else if (personalized ? remainingAfter < projectedNeed : remainingAfter < cautionBand) {
    verdict = "caution";
    i18nKey = "decision.caution";
  } else {
    verdict = "yes";
    i18nKey = "decision.yes";
  }

  const dailyAllowanceAfter = personalized
    ? round(remainingAfter / ctx!.daysUntilNextIncome)
    : undefined;

  const params = {
    amount: amount.toFixed(0),
    available: discretionaryAvailable.toFixed(0),
    remaining: Math.abs(remainingAfter).toFixed(0),
    buffer: safetyBuffer.toFixed(0),
    currency,
  };

  return {
    verdict,
    amount,
    currency,
    currentBalance: round(currentBalance),
    upcomingCommitments: round(upcomingCommitments),
    plannedThisMonth: round(plannedUpcoming),
    safetyBuffer: round(safetyBuffer),
    discretionaryAvailable,
    remainingAfter,
    message: buildMessage(verdict, params),
    i18n: { key: i18nKey, params },
    personalized,
    typicalDailySpend: personalized ? round(ctx!.typicalDailySpend) : undefined,
    daysUntilNextIncome: personalized ? ctx!.daysUntilNextIncome : undefined,
    dailyAllowanceAfter,
  };
}

function buildMessage(
  verdict: DecisionVerdict,
  p: Record<string, string | number>
): string {
  switch (verdict) {
    case "yes":
      return `Go for it. You have ${p.currency}${p.available} of fun money this month — after this you'd still have ${p.currency}${p.remaining} left.`;
    case "caution":
      return `You can, but it's tight. This would leave only ${p.currency}${p.remaining} of breathing room before your ${p.currency}${p.buffer} safety buffer.`;
    case "no":
    default:
      return `Better wait. This would push you ${p.currency}${p.remaining} past your safety buffer for the rest of the month.`;
  }
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Traffic-light status used by the dashboard headline card. */
export function statusFor(discretionaryAvailable: number): "green" | "yellow" | "red" {
  if (discretionaryAvailable <= 0) return "red";
  if (discretionaryAvailable < 50) return "yellow";
  return "green";
}
