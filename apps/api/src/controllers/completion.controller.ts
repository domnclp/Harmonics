import type { Request, Response } from "express";
import { z } from "zod";
import { completionService } from "../services/completion.service.js";

const completionSchema = z.object({
  completed: z.boolean().optional(),
  failureReason: z.string().max(80).nullable().optional()
});

const instanceCompletionSchema = z.object({
  completed: z.boolean(),
  failureReason: z.string().max(80).nullable().optional(),
  journalContent: z.string().max(10000).optional()
});

export const completionController = {
  async updateHabit(req: Request, res: Response) {
    const body = completionSchema.parse(req.body);
    res.json(await completionService.updateHabit(req.authUser!.id, req.params.id as string, body));
  },

  async updateTask(req: Request, res: Response) {
    const body = completionSchema.parse(req.body);
    res.json(await completionService.updateTask(req.authUser!.id, req.params.id as string, body));
  },

  async updateInstance(req: Request, res: Response) {
    const body = instanceCompletionSchema.parse(req.body);
    res.json(await completionService.updateInstance(req.authUser!.id, req.params.instanceId as string, body));
  }
};
