import cors from "cors";
import express from "express";
import type { RequestHandler } from "express";
import * as helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env.js";
import { requireAuth } from "./middleware/auth.middleware.js";
import { errorHandler, notFound } from "./middleware/error.middleware.js";
import { prisma } from "./prisma/client.js";
import { analyticsRoutes } from "./routes/analytics.routes.js";
import { blockInstanceRoutes } from "./routes/blockInstance.routes.js";
import { completionRoutes } from "./routes/completion.routes.js";
import { journalRoutes } from "./routes/journal.routes.js";
import { scheduleBlockRoutes } from "./routes/scheduleBlock.routes.js";
import { scheduleRoutes } from "./routes/schedule.routes.js";
import { templateRoutes } from "./routes/template.routes.js";

export const app = express();

const helmetFn = helmet.default as unknown as (opts?: Record<string, unknown>) => RequestHandler;
const helmetMiddleware = helmetFn({
  crossOriginResourcePolicy: false,
  crossOriginEmbedderPolicy: false
});
const normalizeOrigin = (origin: string) => origin.trim().replace(/\/+$/, "");
const allowedOrigins = env.CORS_ORIGIN.split(",").map(normalizeOrigin).filter(Boolean);
const isAllowedOrigin = (origin: string) => {
  const normalizedOrigin = normalizeOrigin(origin);
  return (
    allowedOrigins.includes("*") ||
    allowedOrigins.includes(normalizedOrigin) ||
    normalizedOrigin.endsWith(".vercel.app")
  );
};

app.use(helmetMiddleware);
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || isAllowedOrigin(origin)) {
        callback(null, true);
        return;
      }

      callback(null, false);
    },
    credentials: true
  })
);
app.use(express.json());
app.use(morgan("dev"));

app.get("/", (_req, res) => {
  res.json({ ok: true, service: "harmonics-api" });
});

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/health/db", async (_req, res, next) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      ok: true,
      database: "reachable",
      config: {
        hasDatabaseUrl: Boolean(env.DATABASE_URL),
        hasSupabaseUrl: Boolean(env.SUPABASE_URL),
        hasServiceRoleKey: Boolean(env.SUPABASE_SERVICE_ROLE_KEY),
        hasJwtSecret: Boolean(env.SUPABASE_JWT_SECRET),
        corsOrigins: env.CORS_ORIGIN.split(",").map((origin) => origin.trim()).filter(Boolean).length
      }
    });
  } catch (error) {
    next(error);
  }
});

app.use("/api/schedules", requireAuth, scheduleRoutes);
app.use("/api/templates", requireAuth, templateRoutes);
app.use("/api/schedule-blocks", requireAuth, scheduleBlockRoutes);
app.use("/api/block-instances", requireAuth, blockInstanceRoutes);
app.use("/api", requireAuth, completionRoutes);
app.use("/api/journal-entries", requireAuth, journalRoutes);
app.use("/api/analytics", requireAuth, analyticsRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
