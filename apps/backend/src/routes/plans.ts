import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../middleware/error";
import { notFound } from "../lib/httpError";
import { PLAN_TYPE_IDS } from "@pace/shared";
import {
  createPlan,
  deletePlan,
  listPlans,
  suggestAmountForType,
  updatePlan,
} from "../services/plans";

export const plansRouter = Router();
plansRouter.use(requireAuth);

const planTypeSchema = z.enum(PLAN_TYPE_IDS as [string, ...string[]]);

// List plans (optionally only upcoming ones).
plansRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const upcomingOnly = req.query.upcoming === "true";
    res.json(await listPlans(req.userId!, { upcomingOnly }));
  })
);

// Suggested cost for a plan type, learned from history.
plansRouter.get(
  "/suggest",
  asyncHandler(async (req, res) => {
    const type = planTypeSchema.parse(req.query.type);
    res.json(await suggestAmountForType(req.userId!, type as never));
  })
);

const dateString = z.string().datetime({ offset: true }).or(z.string().date());

const createSchema = z.object({
  title: z.string().max(80).optional(),
  type: planTypeSchema,
  date: dateString,
  endDate: dateString.nullable().optional(),
  estimatedAmount: z.number().min(0).max(1000000),
});

plansRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const input = createSchema.parse(req.body);
    const plan = await createPlan(req.userId!, {
      title: input.title,
      type: input.type as never,
      date: new Date(input.date),
      endDate: input.endDate ? new Date(input.endDate) : null,
      estimatedAmount: input.estimatedAmount,
    });
    res.status(201).json(plan);
  })
);

const updateSchema = z.object({
  title: z.string().max(80).optional(),
  type: planTypeSchema.optional(),
  date: dateString.optional(),
  endDate: dateString.nullable().optional(),
  estimatedAmount: z.number().min(0).max(1000000).optional(),
  actualAmount: z.number().min(0).max(1000000).nullable().optional(),
  status: z.enum(["planned", "done", "skipped"]).optional(),
});

plansRouter.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const patch = updateSchema.parse(req.body);
    const plan = await updatePlan(req.userId!, req.params.id, {
      title: patch.title,
      type: patch.type as never,
      date: patch.date ? new Date(patch.date) : undefined,
      endDate:
        patch.endDate === undefined
          ? undefined
          : patch.endDate === null
          ? null
          : new Date(patch.endDate),
      estimatedAmount: patch.estimatedAmount,
      actualAmount: patch.actualAmount,
      status: patch.status,
    });
    if (!plan) throw notFound("Plan not found");
    res.json(plan);
  })
);

plansRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const ok = await deletePlan(req.userId!, req.params.id);
    if (!ok) throw notFound("Plan not found");
    res.status(204).end();
  })
);
