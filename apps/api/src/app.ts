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
import { notificationsRoutes } from "./routes/notifications.routes.js";
import { pushRoutes } from "./routes/push.routes.js";
import { scheduleBlockRoutes } from "./routes/scheduleBlock.routes.js";
import { scheduleRoutes } from "./routes/schedule.routes.js";
import { templateRoutes } from "./routes/template.routes.js";
import { userSettingsRoutes } from "./routes/userSettings.routes.js";

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

// Identifies the deployed build. Unauthenticated so the Settings page can show
// it next to the web version — the two deploy separately, and only comparing
// both answers "did my push actually land?". A commit SHA is public information
// in a public repo, and startedAt only reveals that the host restarted.
const startedAt = new Date().toISOString();
app.get("/version", (_req, res) => {
  res.json({
    // Render sets RENDER_GIT_COMMIT on every build.
    commit: (process.env.RENDER_GIT_COMMIT ?? "unknown").slice(0, 7),
    startedAt
  });
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

// Mounted before the broad "/api" mount below, which would otherwise apply
// requireAuth to it. Not authenticated: the caller is an external scheduler
// with no user session, so notificationsController.tick guards it with a
// shared secret instead.
app.use("/api/notifications", notificationsRoutes);
app.use("/api/schedules", requireAuth, scheduleRoutes);
app.use("/api/templates", requireAuth, templateRoutes);
app.use("/api/schedule-blocks", requireAuth, scheduleBlockRoutes);
app.use("/api/block-instances", requireAuth, blockInstanceRoutes);
app.use("/api", requireAuth, completionRoutes);
app.use("/api/journal-entries", requireAuth, journalRoutes);
app.use("/api/analytics", requireAuth, analyticsRoutes);
app.use("/api/user-settings", requireAuth, userSettingsRoutes);
app.use("/api/push", requireAuth, pushRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
