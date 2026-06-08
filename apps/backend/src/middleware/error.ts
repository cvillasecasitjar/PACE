import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { HttpError } from "../lib/httpError";

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ error: "not_found", message: "Route not found" });
}

// Express error handler must keep the 4-arg signature to be recognised.
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.code, message: err.message });
    return;
  }
  if (err instanceof ZodError) {
    res.status(400).json({
      error: "validation_error",
      message: err.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
    });
    return;
  }
  // eslint-disable-next-line no-console
  console.error("[unhandled error]", err);
  res
    .status(500)
    .json({ error: "internal_error", message: "Something went wrong" });
}

/** Wraps async route handlers so thrown errors reach the error handler. */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res, next).catch(next);
  };
}
