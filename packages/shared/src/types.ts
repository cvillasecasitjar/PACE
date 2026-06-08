import type { CategoryId } from "./categories";
import type { PlanType, PlanStatus } from "./plans";
import type { ParsedSpend } from "./parse";

/** Supported Open Banking providers behind the abstraction layer. */
export type BankProviderId = "mock" | "tink" | "plaid";

export type Locale = "en" | "es";

export interface User {
  id: string;
  email: string;
  displayName: string;
  /** User-configured safety buffer in their main currency (e.g. €). */
  safetyBuffer: number;
  locale: Locale;
  createdAt: string;
}

export interface BankConnection {
  id: string;
  userId: string;
  provider: BankProviderId;
  /** Human-friendly institution name, e.g. "BBVA" or "Demo Bank". */
  institutionName: string;
  /** Provider-side account identifier. */
  accountId: string;
  /** Masked account label shown to the user, e.g. "•••• 4321". */
  mask: string;
  currency: string;
  /** Current balance as last synchronised. */
  balance: number;
  lastSync: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface Transaction {
  id: string;
  userId: string;
  connectionId: string;
  /** Negative = expense, positive = income. */
  amount: number;
  currency: string;
  description: string;
  merchant: string | null;
  category: CategoryId;
  /** True when the user manually corrected the category (used for learning). */
  categoryConfirmed: boolean;
  isRecurring: boolean;
  date: string;
  createdAt: string;
}

export interface Budget {
  id: string;
  userId: string;
  category: CategoryId;
  /** Monthly limit. */
  limit: number;
  /** Amount spent so far this month in this category (computed). */
  spent: number;
  /** "YYYY-MM" period this budget snapshot refers to. */
  period: string;
}

/** ----- Planned events ("Plans" / Calendar) ----- */

export interface PlannedEvent {
  id: string;
  userId: string;
  /** Free-text label, e.g. "Cena con Marta". Defaults to the type label. */
  title: string;
  type: PlanType;
  /** ISO date of the plan (start day). */
  date: string;
  /** Optional ISO end date for multi-day plans (e.g. a weekend). */
  endDate: string | null;
  /** What the user expects to spend. */
  estimatedAmount: number;
  /** What they actually spent, once marked as done (drives learning). */
  actualAmount: number | null;
  status: PlanStatus;
  /** Transaction that fulfilled this plan, once auto-reconciled (or null). */
  matchedTxId: string | null;
  createdAt: string;
}

/** A learned cost estimate for a plan type, with where it came from. */
export interface PlanSuggestion {
  type: PlanType;
  suggested: number;
  /** Transparency for the UI: did we learn this or fall back to a default? */
  basis: "history" | "category" | "default";
}

/** ----- Decision engine ("Can I afford this?") ----- */

export type DecisionVerdict = "yes" | "caution" | "no";

export interface DecisionRequest {
  amount: number;
  /** Optional category to attribute the hypothetical spend to. */
  category?: CategoryId;
}

export interface DecisionResult {
  verdict: DecisionVerdict;
  amount: number;
  currency: string;
  /** Money currently available across active accounts. */
  currentBalance: number;
  /** Detected fixed commitments still due before month end. */
  upcomingCommitments: number;
  /** The user's configured safety buffer. */
  safetyBuffer: number;
  /** Upcoming planned events (Calendar) still to come this month. */
  plannedThisMonth: number;
  /** balance − commitments − planned − buffer (the true discretionary amount). */
  discretionaryAvailable: number;
  /** What would remain after the hypothetical purchase. */
  remainingAfter: number;
  /** Short, human, non-alarming recommendation. */
  message: string;
  /** Localisation key + params so the client can render in the user's language. */
  i18n: { key: string; params: Record<string, string | number> };

  /**
   * Personalisation block (Level 1). Present only when we have enough history
   * to learn the user's real spending rhythm and income cycle. Designed for
   * irregular income: the verdict accounts for how many days remain until the
   * next expected income at the user's typical daily burn rate.
   */
  personalized?: boolean;
  /** Average discretionary ("fun money") spend per day, learned from history. */
  typicalDailySpend?: number;
  /** Estimated days until the next recurring income lands. */
  daysUntilNextIncome?: number;
  /** How much/day you could spend until next income AFTER this purchase. */
  dailyAllowanceAfter?: number;
}

/** ----- Conversational "Can I?" ----- */

export interface SpendQueryResult {
  /** What we understood from the free text. */
  parsed: ParsedSpend;
  /** Full decision, or null when no amount could be read. */
  decision: DecisionResult | null;
  /** Resolved category for the spend. */
  category: CategoryId;
  /** Already spent in that category this month. */
  spentThisMonth: number;
  /** Budget limit for that category, if one is set. */
  budgetLimit: number | null;
  /** Budget left for that category this month (limit − spent), if budgeted. */
  budgetRemaining: number | null;
}

/** ----- Dashboard aggregate ----- */

export interface CategorySpend {
  category: CategoryId;
  /** Total spent in this category this month (positive magnitude). */
  spent: number;
  /** Budget limit for the category, if one is set. */
  budgetLimit: number | null;
  /** spent ÷ total month spend, in 0..1 (for the relative bar). */
  share: number;
}

export interface DashboardSummary {
  currency: string;
  currentBalance: number;
  /** Discretionary "fun money" left this month. */
  discretionaryAvailable: number;
  /** Traffic-light status for the headline card. */
  status: "green" | "yellow" | "red";
  spentLast7Days: number;
  spentThisMonth: number;
  upcomingCommitments: number;
  /** Sum of upcoming planned events (Calendar) for the rest of the month. */
  plannedThisMonth: number;
  safetyBuffer: number;
  recentTransactions: Transaction[];
  /** Daily spend totals for the current week (Mon→Sun) for the mini chart. */
  weeklySpend: { date: string; amount: number }[];
  /** This month's spend grouped by category, sorted high→low. */
  categoryBreakdown: CategorySpend[];
}

/** ----- Auth ----- */

export interface AuthResponse {
  token: string;
  user: User;
}

export interface ApiError {
  error: string;
  message: string;
}
