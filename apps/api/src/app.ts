import cors from "cors";
import express from "express";
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

app.use(helmet.default());
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(express.json());
app.use(morgan("dev"));

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
