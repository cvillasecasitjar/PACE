import type { Locale } from "@pace/shared";
import { prisma } from "../lib/prisma";
import { hashPassword } from "../lib/auth";
import { encryptToken } from "../lib/crypto";
import { getProvider } from "../providers";
import { syncConnection } from "../services/sync";
import { suggestBudgets } from "../services/budgets";
import { reconcilePlans } from "../services/plans";

const DEMO_PASSWORD = "pace1234";

function inDays(n: number): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + n);
  return d;
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

interface SeedProfile {
  email: string;
  displayName: string;
  locale: Locale;
  safetyBuffer: number;
  /** If set, the account balance is anchored to roughly this figure. */
  targetBalance?: number;
}

async function seedUser(p: SeedProfile): Promise<void> {
  // Reset this user for a clean, repeatable seed.
  await prisma.user.deleteMany({ where: { email: p.email } });

  const user = await prisma.user.create({
    data: {
      email: p.email,
      passwordHash: await hashPassword(DEMO_PASSWORD),
      displayName: p.displayName,
      safetyBuffer: p.safetyBuffer,
      locale: p.locale,
    },
  });
  console.log(`\n👤 ${p.displayName} <${p.email}>`);

  // Connect a mock bank account.
  const provider = getProvider("mock");
  const result = await provider.initiateConnection({
    userId: user.id,
    institution: "Demo Bank",
  });
  const account = result.accounts[0];

  // Anchor the balance to the target by encoding an opening into the token.
  // The opening marker doesn't change the generated history, only the starting
  // balance — so the figure stays stable across re-syncs.
  let token = result.token;
  let balance = account.balance;
  if (p.targetBalance != null) {
    const txns = await provider.fetchTransactions({
      token: result.token,
      accountId: account.accountId,
    });
    const sum = txns.reduce((acc, t) => acc + t.amount, 0);
    const opening = round(p.targetBalance - sum);
    token = `${result.token}~open=${opening}`;
    balance = p.targetBalance;
  }

  const connection = await prisma.bankConnection.create({
    data: {
      userId: user.id,
      provider: "mock",
      institutionName: account.institutionName,
      accountId: account.accountId,
      mask: account.mask,
      currency: account.currency,
      balance,
      encryptedToken: encryptToken(token),
    },
  });
  const sync = await syncConnection(connection.id);
  console.log(`   • Imported ${sync.imported} transactions · balance ≈ ${sync.balance} €`);

  // Pre-fill suggested budgets so the Budgets screen isn't empty.
  const suggestions = (await suggestBudgets(user.id)).slice(0, 4);
  for (const s of suggestions) {
    await prisma.budget.upsert({
      where: { userId_category: { userId: user.id, category: s.category } },
      create: { userId: user.id, category: s.category, limit: s.suggested },
      update: { limit: s.suggested },
    });
  }
  console.log(`   • Created ${suggestions.length} starter budgets`);

  // A few plans: two upcoming + one past plan we auto-reconcile from real spend.
  await prisma.plannedEvent.createMany({
    data: [
      {
        userId: user.id,
        title: "Cena con amigos",
        type: "dinner",
        date: inDays(3),
        estimatedAmount: 30,
        status: "planned",
      },
      {
        userId: user.id,
        title: "Concierto",
        type: "concert",
        date: inDays(9),
        estimatedAmount: 45,
        status: "planned",
      },
      {
        userId: user.id,
        title: "Cena del finde pasado",
        type: "dinner",
        date: inDays(-4),
        estimatedAmount: 35,
        status: "planned",
      },
    ],
  });
  const reconciled = await reconcilePlans(user.id);
  console.log(`   • Created 3 plans (${reconciled} auto-reconciled)`);
}

async function main() {
  console.log("🌱 Seeding Pace demo data…");

  // Alex: a student living tight (random student-like balance, often low/red).
  await seedUser({
    email: "demo@pace.app",
    displayName: "Alex",
    locale: "es",
    safetyBuffer: 100,
  });

  // Cristina: a healthier profile with ~2000 € in the account.
  await seedUser({
    email: "cristina@pace.app",
    displayName: "Cristina",
    locale: "es",
    safetyBuffer: 200,
    targetBalance: 2000,
  });

  console.log("\n✅ Done. Log in with password '" + DEMO_PASSWORD + "':");
  console.log("   • demo@pace.app      (Alex)");
  console.log("   • cristina@pace.app  (Cristina, ~2000 €)\n");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
