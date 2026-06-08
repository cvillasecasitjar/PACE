import { prisma } from "../lib/prisma";
import { decryptToken } from "../lib/crypto";
import { getProvider } from "../providers";
import type { BankProviderId } from "@pace/shared";
import {
  categorizeWithRules,
  getUserRules,
} from "./categorization";
import { detectAndFlagRecurring } from "./finance";

export interface SyncResult {
  connectionId: string;
  imported: number;
  balance: number;
}

/** Synchronise a single bank connection: fetch → categorise → upsert. */
export async function syncConnection(connectionId: string): Promise<SyncResult> {
  const connection = await prisma.bankConnection.findUniqueOrThrow({
    where: { id: connectionId },
  });
  if (!connection.isActive) {
    return { connectionId, imported: 0, balance: connection.balance };
  }

  const provider = getProvider(connection.provider as BankProviderId);
  const token = decryptToken(connection.encryptedToken);
  const userRules = await getUserRules(connection.userId);

  const providerTxns = await provider.fetchTransactions({
    token,
    accountId: connection.accountId,
  });

  let imported = 0;
  for (const pt of providerTxns) {
    const category = categorizeWithRules(
      pt.description,
      pt.merchant,
      pt.rawCategory,
      userRules
    );
    // Upsert by (connectionId, externalId) to stay idempotent across re-syncs.
    const existing = await prisma.transaction.findUnique({
      where: {
        connectionId_externalId: {
          connectionId: connection.id,
          externalId: pt.externalId,
        },
      },
      select: { id: true, categoryConfirmed: true },
    });

    if (!existing) {
      await prisma.transaction.create({
        data: {
          userId: connection.userId,
          connectionId: connection.id,
          externalId: pt.externalId,
          amount: pt.amount,
          currency: pt.currency,
          description: pt.description,
          merchant: pt.merchant,
          category,
          date: new Date(pt.date),
        },
      });
      imported++;
    } else if (!existing.categoryConfirmed) {
      // Refresh auto-category only if the user hasn't manually pinned it.
      await prisma.transaction.update({
        where: { id: existing.id },
        data: { category },
      });
    }
  }

  const balance = await provider.fetchBalance({
    token,
    accountId: connection.accountId,
  });

  await prisma.bankConnection.update({
    where: { id: connection.id },
    data: { balance, lastSync: new Date() },
  });

  await detectAndFlagRecurring(connection.userId);

  await prisma.auditLog.create({
    data: {
      userId: connection.userId,
      action: "bank.sync",
      detail: `connection=${connection.id} imported=${imported}`,
    },
  });

  return { connectionId: connection.id, imported, balance };
}

/** Sync every active connection for a user. */
export async function syncUser(userId: string): Promise<SyncResult[]> {
  const connections = await prisma.bankConnection.findMany({
    where: { userId, isActive: true },
    select: { id: true },
  });
  const results: SyncResult[] = [];
  for (const c of connections) {
    results.push(await syncConnection(c.id));
  }
  return results;
}

let timer: NodeJS.Timeout | null = null;

/**
 * Background sync worker. FR-02 requires at least every 6 hours; we tick more
 * often in dev so newly elapsed days appear. On-demand sync is exposed via the
 * API for the pull-to-refresh action.
 */
export function startSyncWorker(intervalMs = 6 * 60 * 60 * 1000): void {
  if (timer) return;
  const tick = async () => {
    try {
      const connections = await prisma.bankConnection.findMany({
        where: { isActive: true },
        select: { id: true },
      });
      for (const c of connections) await syncConnection(c.id);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[sync worker]", err);
    }
  };
  timer = setInterval(tick, intervalMs);
}
