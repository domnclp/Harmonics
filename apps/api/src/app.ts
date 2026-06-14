import cors from "cors";
import express from "express";
import type { RequestHandler } from "express";
import * as helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env.js";
import { requireAuth } from "./middleware/auth.middleware.js";
import { errorHandler, notFound } from "./middleware/error.middleware.js";
import { analyticsRoutes } from "./routes/analytics.routes.js";
import { blockInstanceRoutes } from "./routes/blockInstance.routes.js";
import { completionRoutes } from "./routes/completion.routes.js";
import { journalRoutes } from "./routes/journal.routes.js";
import { scheduleBlockRoutes } from "./routes/scheduleBlock.routes.js";
import { scheduleRoutes } from "./routes/schedule.routes.js";
import { templateRoutes } from "./routes/template.routes.js";

export const app = express();

const helmetMiddleware = (helmet.default as unknown as () => RequestHandler)();
const normalizeOrigin = (origin: string) => origin.trim().replace(/\/+$/, "");
const allowedOrigins = env.CORS_ORIGIN.split(",").map(normalizeOrigin).filter(Boolean);

app.use(helmetMiddleware);
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(normalizeOrigin(origin))) {
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
