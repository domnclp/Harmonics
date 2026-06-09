import type { Request, Response } from "express";
import { z } from "zod";
import { analyticsService } from "../services/analytics.service.js";

const mondayOfCurrentWeek = () => {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate() + diff));
  return monday.toISOString().slice(0, 10);
};

const weekStartSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional();

export const analyticsController = {
  async weekly(req: Request, res: Response) {
    const weekStart = weekStartSchema.parse(req.query.weekStart) ?? mondayOfCurrentWeek();
    res.json(await analyticsService.weekly(req.authUser!.id, weekStart));
  },

  async templates(req: Request, res: Response) {
    res.json(await analyticsService.templates(req.authUser!.id));
  },

  async failureReasons(req: Request, res: Response) {
    res.json(await analyticsService.failureReasons(req.authUser!.id));
  }
};
