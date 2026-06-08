import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../middleware/error";
import { toSharedTransaction } from "../services/finance";
import { learnFromCorrection } from "../services/categorization";
import { notFound } from "../lib/httpError";
import { CATEGORY_IDS } from "@pace/shared";

export const transactionsRouter = Router();
transactionsRouter.use(requireAuth);

const listSchema = z.object({
  category: z.string().optional(),
  connectionId: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  search: z.string().optional(),
  limit: z.coerce.number().min(1).max(500).optional(),
});

transactionsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const q = listSchema.parse(req.query);
    const where: Record<string, unknown> = { userId: req.userId };
    if (q.category) where.category = q.category;
    if (q.connectionId) where.connectionId = q.connectionId;
    if (q.from || q.to) {
      where.date = {
        ...(q.from ? { gte: new Date(q.from) } : {}),
        ...(q.to ? { lte: new Date(q.to) } : {}),
      };
    }
    if (q.search) {
      where.OR = [
        { description: { contains: q.search } },
        { merchant: { contains: q.search } },
      ];
    }

    const txns = await prisma.transaction.findMany({
      where,
      orderBy: { date: "desc" },
      take: q.limit ?? 200,
    });
    res.json(txns.map(toSharedTransaction));
  })
);

const correctSchema = z.object({
  category: z.enum(CATEGORY_IDS as [string, ...string[]]),
});

// Manual category correction — also teaches the categorisation engine (FR-04).
transactionsRouter.patch(
  "/:id/category",
  asyncHandler(async (req, res) => {
    const { category } = correctSchema.parse(req.body);
    const txn = await prisma.transaction.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    if (!txn) throw notFound("Transaction not found");

    const updated = await prisma.transaction.update({
      where: { id: txn.id },
      data: { category, categoryConfirmed: true },
    });

    await learnFromCorrection(
      req.userId!,
      txn.merchant,
      txn.description,
      category as never
    );

    res.json(toSharedTransaction(updated));
  })
);
