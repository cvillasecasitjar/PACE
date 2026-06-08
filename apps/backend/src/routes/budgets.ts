import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../middleware/error";
import {
  deleteBudget,
  listBudgets,
  suggestBudgets,
  upsertBudget,
} from "../services/budgets";
import { CATEGORY_IDS } from "@pace/shared";

export const budgetsRouter = Router();
budgetsRouter.use(requireAuth);

budgetsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    res.json(await listBudgets(req.userId!));
  })
);

budgetsRouter.get(
  "/suggestions",
  asyncHandler(async (req, res) => {
    res.json(await suggestBudgets(req.userId!));
  })
);

const upsertSchema = z.object({
  category: z.enum(CATEGORY_IDS as [string, ...string[]]),
  limit: z.number().min(0).max(100000),
});

budgetsRouter.put(
  "/",
  asyncHandler(async (req, res) => {
    const { category, limit } = upsertSchema.parse(req.body);
    res.json(await upsertBudget(req.userId!, category as never, limit));
  })
);

budgetsRouter.delete(
  "/:category",
  asyncHandler(async (req, res) => {
    await deleteBudget(req.userId!, req.params.category as never);
    res.json({ ok: true });
  })
);
