import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../middleware/error";
import { encryptToken, decryptToken } from "../lib/crypto";
import { getProvider } from "../providers";
import { syncConnection, syncUser } from "../services/sync";
import { getRecurringPayments } from "../services/finance";
import { notFound } from "../lib/httpError";
import type { BankConnection, BankProviderId } from "@pace/shared";

export const bankRouter = Router();
bankRouter.use(requireAuth);

function serializeConnection(c: {
  id: string;
  userId: string;
  provider: string;
  institutionName: string;
  accountId: string;
  mask: string;
  currency: string;
  balance: number;
  lastSync: Date | null;
  isActive: boolean;
  createdAt: Date;
}): BankConnection {
  return {
    id: c.id,
    userId: c.userId,
    provider: c.provider as BankProviderId,
    institutionName: c.institutionName,
    accountId: c.accountId,
    mask: c.mask,
    currency: c.currency,
    balance: c.balance,
    lastSync: c.lastSync ? c.lastSync.toISOString() : null,
    isActive: c.isActive,
    createdAt: c.createdAt.toISOString(),
  };
}

bankRouter.get(
  "/connections",
  asyncHandler(async (req, res) => {
    const connections = await prisma.bankConnection.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: "asc" },
    });
    res.json(connections.map(serializeConnection));
  })
);

const connectSchema = z.object({
  provider: z.enum(["mock", "tink", "plaid"]).optional(),
  institution: z.string().optional(),
});

/**
 * Connect a bank account. For the mock provider this completes instantly and
 * triggers an initial sync, so the user sees real insights within seconds
 * (radical 3-minute onboarding). For real providers this returns an `authUrl`
 * that the app opens for the bank's SCA flow.
 */
bankRouter.post(
  "/connect",
  asyncHandler(async (req, res) => {
    const { provider, institution } = connectSchema.parse(req.body);
    const bank = getProvider(provider as BankProviderId | undefined);

    const result = await bank.initiateConnection({
      userId: req.userId!,
      institution,
    });

    if (result.authUrl) {
      // Real provider: hand the SCA URL back to the client.
      res.json({ status: "redirect", authUrl: result.authUrl });
      return;
    }

    const account = result.accounts[0];
    const connection = await prisma.bankConnection.create({
      data: {
        userId: req.userId!,
        provider: bank.id,
        institutionName: account.institutionName,
        accountId: account.accountId,
        mask: account.mask,
        currency: account.currency,
        balance: account.balance,
        encryptedToken: encryptToken(result.token),
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: req.userId!,
        action: "bank.connect",
        detail: `provider=${bank.id} institution=${account.institutionName}`,
      },
    });

    const sync = await syncConnection(connection.id);
    const refreshed = await prisma.bankConnection.findUniqueOrThrow({
      where: { id: connection.id },
    });

    res.status(201).json({
      status: "connected",
      connection: serializeConnection(refreshed),
      imported: sync.imported,
    });
  })
);

bankRouter.post(
  "/sync",
  asyncHandler(async (req, res) => {
    const results = await syncUser(req.userId!);
    res.json({ results });
  })
);

bankRouter.post(
  "/connections/:id/sync",
  asyncHandler(async (req, res) => {
    const connection = await prisma.bankConnection.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    if (!connection) throw notFound("Connection not found");
    const result = await syncConnection(connection.id);
    res.json(result);
  })
);

// Disconnect: revoke on the provider side and deactivate locally (FR-02).
bankRouter.delete(
  "/connections/:id",
  asyncHandler(async (req, res) => {
    const connection = await prisma.bankConnection.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    if (!connection) throw notFound("Connection not found");

    const provider = getProvider(connection.provider as BankProviderId);
    await provider.revoke({ token: decryptToken(connection.encryptedToken) });

    await prisma.bankConnection.update({
      where: { id: connection.id },
      data: { isActive: false },
    });

    await prisma.auditLog.create({
      data: {
        userId: req.userId!,
        action: "bank.disconnect",
        detail: `connection=${connection.id}`,
      },
    });

    res.json({ ok: true });
  })
);

// Detected recurring payments (for subscription reminders, FR-07).
bankRouter.get(
  "/recurring",
  asyncHandler(async (req, res) => {
    res.json(await getRecurringPayments(req.userId!));
  })
);
