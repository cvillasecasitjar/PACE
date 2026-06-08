import express from "express";
import cors from "cors";
import morgan from "morgan";
import { authRouter } from "./routes/auth";
import { userRouter } from "./routes/user";
import { bankRouter } from "./routes/bank";
import { transactionsRouter } from "./routes/transactions";
import { budgetsRouter } from "./routes/budgets";
import { plansRouter } from "./routes/plans";
import { decisionRouter, dashboardRouter } from "./routes/decision";
import { errorHandler, notFoundHandler } from "./middleware/error";

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());
  if (process.env.NODE_ENV !== "test") {
    app.use(morgan("dev"));
  }

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", service: "pace-backend" });
  });

  app.use("/api/auth", authRouter);
  app.use("/api/user", userRouter);
  app.use("/api/bank", bankRouter);
  app.use("/api/transactions", transactionsRouter);
  app.use("/api/budgets", budgetsRouter);
  app.use("/api/plans", plansRouter);
  app.use("/api/decision", decisionRouter);
  app.use("/api/dashboard", dashboardRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
