import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { hashPassword, signToken, verifyPassword } from "../lib/auth";
import { serializeUser } from "../lib/serialize";
import { asyncHandler } from "../middleware/error";
import { badRequest, conflict, unauthorized } from "../lib/httpError";
import type { AuthResponse } from "@pace/shared";

export const authRouter = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  displayName: z.string().min(1).max(60).optional(),
  locale: z.enum(["en", "es"]).optional(),
});

authRouter.post(
  "/register",
  asyncHandler(async (req, res) => {
    const { email, password, displayName, locale } = registerSchema.parse(
      req.body
    );

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw conflict("An account with this email already exists");

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: await hashPassword(password),
        displayName: displayName || email.split("@")[0],
        locale: locale ?? "es",
      },
    });

    const token = signToken({ sub: user.id, email: user.email });
    const body: AuthResponse = { token, user: serializeUser(user) };
    res.status(201).json(body);
  })
);

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

authRouter.post(
  "/login",
  asyncHandler(async (req, res) => {
    const { email, password } = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw unauthorized("Invalid email or password");

    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) throw unauthorized("Invalid email or password");

    const token = signToken({ sub: user.id, email: user.email });
    const body: AuthResponse = { token, user: serializeUser(user) };
    res.json(body);
  })
);

// Lightweight password-recovery stub (FR-01). In production this would email a
// signed reset link; here it simply confirms the request shape.
const recoverSchema = z.object({ email: z.string().email() });
authRouter.post(
  "/recover",
  asyncHandler(async (req, res) => {
    const { email } = recoverSchema.parse(req.body);
    if (!email) throw badRequest("Email required");
    // Always respond 200 to avoid leaking which emails exist.
    res.json({
      ok: true,
      message: "If an account exists, a reset link has been sent.",
    });
  })
);
