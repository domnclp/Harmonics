import type { Request, Response } from "express";
import { z } from "zod";
import { AppError } from "../middleware/error.middleware.js";
import { env } from "../config/env.js";
import { pushService, isPushConfigured } from "../services/push.service.js";
import { notificationPreferenceService } from "../services/notificationPreference.service.js";
import { describeToday } from "../services/notificationScheduler.service.js";

const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:mm format");

const subscribeSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1)
  })
});

const unsubscribeSchema = z.object({
  endpoint: z.string().url()
});

const preferenceUpdateSchema = z.object({
  headsUpEnabled: z.boolean().optional(),
  // Constrained here rather than in the DB, matching the repo's validate-in-zod convention.
  headsUpMinutes: z.union([z.literal(5), z.literal(10), z.literal(15), z.literal(30)]).optional(),
  blockStartEnabled: z.boolean().optional(),
  blockEndEnabled: z.boolean().optional(),
  streakRiskEnabled: z.boolean().optional(),
  streakRiskTime: timeSchema.optional(),
  dailyAgendaEnabled: z.boolean().optional(),
  dayWrapUpEnabled: z.boolean().optional(),
  dayWrapUpTime: timeSchema.optional()
});

export const pushController = {
  publicKey(_req: Request, res: Response) {
    res.json({ publicKey: env.VAPID_PUBLIC_KEY ?? null, configured: isPushConfigured() });
  },

  async subscribe(req: Request, res: Response) {
    const body = subscribeSchema.parse(req.body);
    const userAgent = req.headers["user-agent"] ?? null;

    await pushService.subscribe(req.authUser!.id, { ...body, userAgent });
    res.status(201).json({ ok: true });
  },

  async unsubscribe(req: Request, res: Response) {
    const body = unsubscribeSchema.parse(req.body);
    await pushService.unsubscribe(req.authUser!.id, body.endpoint);
    res.status(204).send();
  },

  async listSubscriptions(req: Request, res: Response) {
    res.json(await pushService.listSubscriptions(req.authUser!.id));
  },

  async getPreferences(req: Request, res: Response) {
    res.json(await notificationPreferenceService.get(req.authUser!.id));
  },

  async updatePreferences(req: Request, res: Response) {
    const body = preferenceUpdateSchema.parse(req.body);
    res.json(await notificationPreferenceService.upsert(req.authUser!.id, body));
  },

  async test(req: Request, res: Response) {
    if (!isPushConfigured()) {
      throw new AppError(503, "Push notifications are not configured on this server");
    }

    const result = await pushService.sendToUser(req.authUser!.id, {
      title: "Harmonics is set up",
      body: "Notifications are working. You can turn individual reminders on below.",
      tag: "harmonics-test",
      url: "/dashboard"
    });

    if (!result.sent) {
      throw new AppError(404, "No active push subscriptions for this account");
    }

    res.json(result);
  },

  /**
   * Temporary verification aid: reports the blocks the scheduler thinks occur
   * today, so the ported UTC recurrence logic can be diffed against the web
   * Schedule page. Remove once the scheduler is trusted.
   */
  async debugToday(req: Request, res: Response) {
    if (process.env.NODE_ENV === "production") {
      throw new AppError(404, "Route not found");
    }

    res.json(await describeToday(req.authUser!.id));
  }
};
