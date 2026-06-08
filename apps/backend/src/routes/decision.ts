import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../middleware/error";
import { buildDashboard, runDecision } from "../services/finance";
import { askSpend } from "../services/ask";

export const decisionRouter = Router();
decisionRouter.use(requireAuth);

const decisionSchema = z.object({
  amount: z.number().min(0).max(1000000),
});

// FR-06: "Can I afford X?" decision engine.
decisionRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const { amount } = decisionSchema.parse(req.body);
    res.json(await runDecision(req.userId!, amount));
  })
);

const askSchema = z.object({
  text: z.string().min(1).max(280),
});

// Conversational "Can I?": free text → parsed spend + decision + context.
decisionRouter.post(
  "/ask",
  asyncHandler(async (req, res) => {
    const { text } = askSchema.parse(req.body);
    res.json(await askSpend(req.userId!, text));
  })
);

export const dashboardRouter = Router();
dashboardRouter.use(requireAuth);

// FR-03: main dashboard aggregate.
dashboardRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    res.json(await buildDashboard(req.userId!));
  })
);
