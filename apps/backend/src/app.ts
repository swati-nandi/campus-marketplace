import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { env } from "./config/env";
import { query } from "./db/pool";
import { errorHandler, notFound } from "./middleware/error";
import { apiLimiter } from "./middleware/rateLimit";
import authRoutes from "./routes/auth";
import listingRoutes from "./routes/listings";
import metaRoutes from "./routes/meta";
import purchaseRoutes from "./routes/purchases";

export function createApp() {
  const app = express();

  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
  app.use(cors({ origin: env.corsOrigins, credentials: true }));
  app.use(express.json({ limit: "100kb" }));
  app.use(cookieParser());
  app.use("/api", apiLimiter);

  app.get("/api/health", async (_req, res) => {
    try {
      await query("SELECT 1");
      res.json({ status: "ok" });
    } catch {
      res.status(503).json({ error: "Database unavailable" });
    }
  });

  app.use("/api/auth", authRoutes);
  app.use("/api/listings", listingRoutes);
  app.use("/api", metaRoutes);
  app.use("/api", purchaseRoutes);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}