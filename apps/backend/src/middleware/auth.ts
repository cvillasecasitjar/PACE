import type { NextFunction, Request, Response } from "express";
import { verifyToken } from "../lib/auth";
import { unauthorized } from "../lib/httpError";
import { prisma } from "../lib/prisma";

// Augment Express Request with the authenticated user id.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId?: string;
      userEmail?: string;
    }
  }
}

export async function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return next(unauthorized("Missing bearer token"));
  }
  let payload: { sub: string; email: string };
  try {
    payload = verifyToken(header.slice(7));
  } catch {
    return next(unauthorized("Invalid or expired token"));
  }
  // Verify the user still exists. Otherwise a token from a deleted/reseeded
  // user would pass signature checks but then crash on foreign-key writes.
  // Returning 401 lets the app drop the stale session and ask for re-login.
  try {
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true },
    });
    if (!user) {
      return next(unauthorized("Session expired, please log in again"));
    }
    req.userId = payload.sub;
    req.userEmail = payload.email;
    next();
  } catch (err) {
    next(err);
  }
}
