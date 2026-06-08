import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../middleware/error";
import { serializeUser } from "../lib/serialize";

export const userRouter = Router();
userRouter.use(requireAuth);

userRouter.get(
  "/me",
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: req.userId },
    });
    res.json(serializeUser(user));
  })
);

const updateSchema = z.object({
  displayName: z.string().min(1).max(60).optional(),
  safetyBuffer: z.number().min(0).max(100000).optional(),
  locale: z.enum(["en", "es"]).optional(),
});

userRouter.patch(
  "/me",
  asyncHandler(async (req, res) => {
    const data = updateSchema.parse(req.body);
    const user = await prisma.user.update({
      where: { id: req.userId },
      data,
    });
    res.json(serializeUser(user));
  })
);

// GDPR: full account + data deletion (cascades to all related records).
userRouter.delete(
  "/me",
  asyncHandler(async (req, res) => {
    await prisma.user.delete({ where: { id: req.userId } });
    res.json({ ok: true });
  })
);
