import type { Request, Response } from "express";
import { timingSafeEqual } from "node:crypto";
import { env } from "../config/env.js";
import { AppError } from "../middleware/error.middleware.js";
import { notificationScheduler } from "../services/notificationScheduler.service.js";

/**
 * Compare without leaking length or content through timing. timingSafeEqual
 * throws on length mismatch, so guard that first.
 */
const secretMatches = (provided: string, expected: string) => {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
};

export const notificationsController = {
  /**
   * Runs one scheduler tick. This exists so an external scheduler (GitHub
   * Actions, cron-job.org) can drive notifications on hosts that sleep between
   * requests and cannot keep an in-process cron alive.
   *
   * Deliberately not behind requireAuth: the caller is a machine with no
   * Supabase session. A shared secret guards it instead.
   */
  async tick(req: Request, res: Response) {
    const expected = env.SCHEDULER_TICK_SECRET;

    // Closed by default. An unset secret must never mean "open to everyone".
    if (!expected) {
      throw new AppError(404, "Route not found");
    }

    const header = req.headers.authorization;
    const provided = header?.startsWith("Bearer ") ? header.slice(7) : "";

    if (!provided || !secretMatches(provided, expected)) {
      throw new AppError(401, "Invalid scheduler secret");
    }

    const result = await notificationScheduler.tick();
    res.json(result);
  }
};
