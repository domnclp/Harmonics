import type { Request, Response } from "express";
import { z } from "zod";
import { scheduleBlockService } from "../services/scheduleBlock.service.js";

const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:mm format");
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD format");

const scheduleBlockSchema = z.object({
  scheduleId: z.string().min(1),
  templateId: z.string().min(1),
  dayOfWeek: z.number().int().min(0).max(6),
  date: dateSchema.nullable().optional(),
  startTime: timeSchema,
  endTime: timeSchema,
  recurrenceRule: z.string().min(1).max(120).optional()
});

export const scheduleBlockController = {
  async list(req: Request, res: Response) {
    res.json(await scheduleBlockService.list(req.authUser!.id));
  },

  async create(req: Request, res: Response) {
    const body = scheduleBlockSchema.parse(req.body);
    res.status(201).json(await scheduleBlockService.create(req.authUser!.id, body));
  },

  async createMany(req: Request, res: Response) {
    const body = z.array(scheduleBlockSchema).min(1).max(31).parse(req.body);
    res.status(201).json(await scheduleBlockService.createMany(req.authUser!.id, body));
  },

  async get(req: Request, res: Response) {
    res.json(await scheduleBlockService.get(req.authUser!.id, req.params.id as string));
  },

  async update(req: Request, res: Response) {
    const body = scheduleBlockSchema.partial().parse(req.body);
    res.json(await scheduleBlockService.update(req.authUser!.id, req.params.id as string, body));
  },

  async remove(req: Request, res: Response) {
    await scheduleBlockService.remove(req.authUser!.id, req.params.id as string);
    res.status(204).send();
  }
};
