import type { Request, Response } from "express";
import { z } from "zod";
import { userSettingsService } from "../services/userSettings.service.js";

const activeDaysSchema = z
  .string()
  .regex(/^[0-6](,[0-6]){0,6}$/, "Use a comma-separated list of day indices (0-6)")
  .refine((value) => {
    const days = value.split(",");
    return days.length > 0 && new Set(days).size === days.length;
  }, "Days must be unique");

// Validate against the ICU database rather than a regex — Intl is authoritative
// and throws RangeError on anything it cannot resolve.
const timezoneSchema = z.string().min(1).refine((value) => {
  try {
    new Intl.DateTimeFormat("en-CA", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}, "Use a valid IANA time zone");

const settingsUpdateSchema = z.object({
  scheduleStart: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
  scheduleEnd: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
  weekStartsOn: z.enum(["monday", "sunday"]).optional(),
  activeDays: activeDaysSchema.optional(),
  timezone: timezoneSchema.optional()
});

export const userSettingsController = {
  async get(req: Request, res: Response) {
    res.json(await userSettingsService.get(req.authUser!.id));
  },

  async update(req: Request, res: Response) {
    const body = settingsUpdateSchema.parse(req.body);
    res.json(await userSettingsService.upsert(req.authUser!.id, body));
  }
};
