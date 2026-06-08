import { prisma } from "../lib/prisma";
import { hashPassword } from "../lib/auth";
import { encryptToken } from "../lib/crypto";
import { getProvider } from "../providers";
import { syncConnection } from "../services/sync";
import { suggestBudgets } from "../services/budgets";

const DEMO_EMAIL = "demo@pace.app";
const DEMO_PASSWORD = "pace1234";

async function main() {
  console.log("🌱 Seeding Pace demo data…");

  // Reset the demo user for a clean, repeatable seed.
  await prisma.user.deleteMany({ where: { email: DEMO_EMAIL } });

  const user = await prisma.user.create({
    data: {
      email: DEMO_EMAIL,
      passwordHash: await hashPassword(DEMO_PASSWORD),
      displayName: "Alex",
      safetyBuffer: 100,
      locale: "es",
    },
  });
  console.log(`   • Created user ${user.email}`);

  // Connect a mock bank account and import its history.
  const provider = getProvider("mock");
  const result = await provider.initiateConnection({
    userId: user.id,
    institution: "Demo Bank",
  });
  const account = result.accounts[0];
  const connection = await prisma.bankConnection.create({
    data: {
      userId: user.id,
      provider: "mock",
      institutionName: account.institutionName,
      accountId: account.accountId,
      mask: account.mask,
      currency: account.currency,
      balance: account.balance,
      encryptedToken: encryptToken(result.token),
    },
  });
  const sync = await syncConnection(connection.id);
  console.log(
    `   • Connected ${account.institutionName} (${account.mask}) — imported ${sync.imported} transactions`
  );

  // Pre-fill a few suggested budgets so the Budgets screen isn't empty.
  const suggestions = (await suggestBudgets(user.id)).slice(0, 4);
  for (const s of suggestions) {
    await prisma.budget.upsert({
      where: { userId_category: { userId: user.id, category: s.category } },
      create: { userId: user.id, category: s.category, limit: s.suggested },
      update: { limit: s.suggested },
    });
  }
  console.log(`   • Created ${suggestions.length} starter budgets`);

  // A couple of upcoming plans so the Calendar tab isn't empty.
  const inDays = (n: number) => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() + n);
    return d;
  };
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
    ],
  });
  console.log("   • Created 2 upcoming plans");

  console.log("\n✅ Done. Log in with:");
  console.log(`   email:    ${DEMO_EMAIL}`);
  console.log(`   password: ${DEMO_PASSWORD}\n`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
