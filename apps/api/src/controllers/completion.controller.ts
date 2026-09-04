import type { Request, Response } from "express";
import { z } from "zod";
import { completionService } from "../services/completion.service.js";

const completionSchema = z.object({
  completed: z.boolean().optional(),
  failureReason: z.string().max(80).nullable().optional()
});

// Sent only when ticking a habit on a day that has not been stored yet, so the
// service knows which day to materialize.
const habitContextSchema = z
  .object({
    scheduleBlockId: z.string().min(1),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected a YYYY-MM-DD date"),
    templateHabitId: z.string().min(1)
  })
  .optional();

const instanceCompletionSchema = z.object({
  completed: z.boolean(),
  failureReason: z.string().max(80).nullable().optional(),
  journalContent: z.string().max(10000).optional()
});

const taskCreateSchema = z.object({
  title: z.string().trim().min(1).max(120)
});

// Matches the "YYYY-MM-DD" date keys used throughout the schedule.
const taskMoveSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected a YYYY-MM-DD date")
});

export const completionController = {
  async updateHabit(req: Request, res: Response) {
    const body = completionSchema.parse(req.body);
    const context = habitContextSchema.parse(req.body.context);
    res.json(await completionService.updateHabit(req.authUser!.id, req.params.id as string, body, context));
  },

  async updateTask(req: Request, res: Response) {
    const body = completionSchema.parse(req.body);
    res.json(await completionService.updateTask(req.authUser!.id, req.params.id as string, body));
  },

  async createTask(req: Request, res: Response) {
    const body = taskCreateSchema.parse(req.body);
    res.status(201).json(await completionService.createTask(req.authUser!.id, req.params.instanceId as string, body));
  },

  async moveTask(req: Request, res: Response) {
    const body = taskMoveSchema.parse(req.body);
    res.json(await completionService.moveTask(req.authUser!.id, req.params.id as string, body.date));
  },

  async deleteTask(req: Request, res: Response) {
    res.json(await completionService.deleteTask(req.authUser!.id, req.params.id as string));
  },

  async updateInstance(req: Request, res: Response) {
    const body = instanceCompletionSchema.parse(req.body);
    res.json(await completionService.updateInstance(req.authUser!.id, req.params.instanceId as string, body));
  }
};
