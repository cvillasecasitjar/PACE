import crypto from "crypto";
import type {
  BankProvider,
  InitiateResult,
  ProviderAccount,
  ProviderTransaction,
} from "./types";

/**
 * Mock Open Banking provider.
 *
 * Generates a realistic, *deterministic* financial life for a student:
 *  - a scholarship landing mid-month,
 *  - occasional part-time pay and family transfers,
 *  - recurring subscriptions + rent + phone bill,
 *  - everyday groceries, transport, coffee, nights out.
 *
 * Determinism (seeded by the token) means re-syncing returns the same history,
 * so de-duplication and budgets behave exactly like a real bank feed.
 */
export class MockBankProvider implements BankProvider {
  readonly id = "mock" as const;

  async initiateConnection(opts: {
    userId: string;
    institution?: string;
  }): Promise<InitiateResult> {
    const token = `mock_${crypto.randomBytes(16).toString("hex")}`;
    const account: ProviderAccount = {
      accountId: `acc_${crypto.randomBytes(6).toString("hex")}`,
      institutionName: opts.institution || "Demo Bank",
      mask: `••••${1000 + (hashSeed(opts.userId) % 9000)}`,
      currency: "EUR",
      balance: 0, // recomputed from generated transactions below
    };
    // Bake the accountId into the token so generation is stable per account.
    const fullToken = `${token}.${account.accountId}`;
    account.balance = computeBalance(
      generate(fullToken, account.accountId),
      openingFor(fullToken)
    );
    return { token: fullToken, accounts: [account], authUrl: null };
  }

  async fetchTransactions(opts: {
    token: string;
    accountId: string;
    since?: string;
  }): Promise<ProviderTransaction[]> {
    const all = generate(opts.token, opts.accountId);
    if (!opts.since) return all;
    const sinceTime = new Date(opts.since).getTime();
    return all.filter((t) => new Date(t.date).getTime() >= sinceTime);
  }

  async fetchBalance(opts: {
    token: string;
    accountId: string;
  }): Promise<number> {
    return computeBalance(
      generate(opts.token, opts.accountId),
      openingFor(opts.token)
    );
  }

  async revoke(): Promise<void> {
    // No remote state to clear for the mock provider.
  }
}

/* -------------------------------------------------------------------------- */
/* Deterministic generation                                                   */
/* -------------------------------------------------------------------------- */

function computeBalance(txns: ProviderTransaction[], opening = 350): number {
  // Start from an opening balance, then apply all movements.
  const sum = txns.reduce((acc, t) => acc + t.amount, 0);
  return round(opening + sum);
}

/**
 * Opening balance for an account. A token may carry an explicit opening as
 * `~open=<n>` (used by the seed to anchor a profile to a target balance). The
 * marker is stripped before generating transactions, so it never changes the
 * history — only the starting balance. Defaults to a modest student opening.
 */
function openingFor(token: string): number {
  const m = token.match(/~open=(-?\d+(?:\.\d+)?)/);
  return m ? parseFloat(m[1]) : 350;
}

/** Token without any `~marker=...` overrides — used as the RNG seed. */
function baseToken(token: string): string {
  const i = token.indexOf("~");
  return i === -1 ? token : token.slice(0, i);
}

const RECURRING: {
  desc: string;
  merchant: string;
  amount: number;
  dayOfMonth: number;
}[] = [
  { desc: "Alquiler habitación", merchant: "Landlord", amount: -350, dayOfMonth: 1 },
  { desc: "Netflix", merchant: "Netflix", amount: -12.99, dayOfMonth: 4 },
  { desc: "Spotify Premium", merchant: "Spotify", amount: -5.99, dayOfMonth: 7 },
  { desc: "Gimnasio", merchant: "BasicFit", amount: -19.99, dayOfMonth: 3 },
  { desc: "Factura móvil", merchant: "Vodafone", amount: -11.0, dayOfMonth: 15 },
];

const GROCERY_MERCHANTS = ["Mercadona", "Lidl", "Carrefour Express", "Dia"];
const RESTAURANT_MERCHANTS = [
  "Telepizza",
  "McDonald's",
  "Cafetería Central",
  "Kebab King",
  "Sushi Bar",
];
const LEISURE_MERCHANTS = [
  "Cines Yelmo",
  "Bar La Esquina",
  "Spotify Concert",
  "Boliche",
];
const TRANSPORT_MERCHANTS = ["Metro Madrid", "Cabify", "Renfe", "BiciMad"];
const SHOPPING_MERCHANTS = ["Zara", "Amazon", "Decathlon", "FNAC"];

function generate(token: string, accountId: string): ProviderTransaction[] {
  const rng = mulberry32(hashSeed(baseToken(token) + accountId));
  const txns: ProviderTransaction[] = [];
  const today = new Date();
  // Generate ~90 days of history.
  const start = new Date(today);
  start.setDate(start.getDate() - 90);

  let counter = 0;
  const push = (
    date: Date,
    amount: number,
    description: string,
    merchant: string,
    rawCategory: string,
    isRecurringHint = false
  ) => {
    // Deterministic external id derived from content.
    const externalId = `mx_${accountId}_${date.toISOString().slice(0, 10)}_${counter++}`;
    txns.push({
      externalId,
      amount: round(amount),
      currency: "EUR",
      description: isRecurringHint ? description : description,
      merchant,
      date: date.toISOString(),
      rawCategory,
    });
  };

  const cursor = new Date(start);
  while (cursor <= today) {
    const dom = cursor.getDate();
    const dow = cursor.getDay(); // 0 Sun .. 6 Sat

    // --- Income ---
    if (dom === 10) {
      push(new Date(cursor), 850, "Beca MEC", "Ministerio Educación", "income");
    }
    // Part-time pay on some Fridays.
    if (dow === 5 && rng() > 0.45) {
      push(new Date(cursor), round(60 + rng() * 60), "Nómina parcial", "Cafetería Central", "income");
    }
    // Occasional family transfer.
    if (dom === 20 && rng() > 0.5) {
      push(new Date(cursor), round(50 + rng() * 50), "Transferencia familia", "Mamá", "transfers");
    }

    // --- Recurring fixed commitments ---
    for (const r of RECURRING) {
      if (dom === r.dayOfMonth) {
        push(new Date(cursor), r.amount, r.desc, r.merchant, categoryHintFor(r.merchant), true);
      }
    }

    // --- Everyday spending ---
    // Groceries ~2x/week.
    if ((dow === 1 || dow === 4) && rng() > 0.2) {
      const m = pick(rng, GROCERY_MERCHANTS);
      push(new Date(cursor), -round(12 + rng() * 28), m, m, "groceries");
    }
    // Coffee / lunch most weekdays.
    if (dow >= 1 && dow <= 5 && rng() > 0.4) {
      const m = pick(rng, RESTAURANT_MERCHANTS);
      push(new Date(cursor), -round(3 + rng() * 12), m, m, "restaurants");
    }
    // Transport on weekdays.
    if (dow >= 1 && dow <= 5 && rng() > 0.5) {
      const m = pick(rng, TRANSPORT_MERCHANTS);
      push(new Date(cursor), -round(1.5 + rng() * 8), m, m, "transport");
    }
    // Weekend leisure.
    if ((dow === 5 || dow === 6) && rng() > 0.35) {
      const m = pick(rng, LEISURE_MERCHANTS);
      push(new Date(cursor), -round(8 + rng() * 30), m, m, "leisure");
    }
    // Occasional shopping.
    if (rng() > 0.92) {
      const m = pick(rng, SHOPPING_MERCHANTS);
      push(new Date(cursor), -round(15 + rng() * 60), m, m, "shopping");
    }

    cursor.setDate(cursor.getDate() + 1);
  }

  // Newest first.
  return txns.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}

function categoryHintFor(merchant: string): string {
  const m = merchant.toLowerCase();
  if (m.includes("netflix") || m.includes("spotify")) return "subscriptions";
  if (m.includes("basicfit") || m.includes("gym")) return "health";
  if (m.includes("vodafone")) return "bills";
  if (m.includes("landlord")) return "housing";
  return "other";
}

/* ---- small deterministic helpers ---- */

function pick<T>(rng: () => number, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

function hashSeed(input: string): number {
  const hash = crypto.createHash("sha256").update(input).digest();
  return hash.readUInt32LE(0);
}

/** Tiny seeded PRNG (mulberry32) — deterministic across runs. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
