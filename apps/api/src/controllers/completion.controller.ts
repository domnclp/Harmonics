import type { Request, Response } from "express";
import { z } from "zod";
import { completionService } from "../services/completion.service.js";

const completionSchema = z.object({
  completed: z.boolean().optional(),
  failureReason: z.string().max(80).nullable().optional()
});

export const completionController = {
  async updateHabit(req: Request, res: Response) {
    const body = completionSchema.parse(req.body);
    res.json(await completionService.updateHabit(req.authUser!.id, req.params.id as string, body));
  },

  async updateTask(req: Request, res: Response) {
    const body = completionSchema.parse(req.body);
    res.json(await completionService.updateTask(req.authUser!.id, req.params.id as string, body));
  }
};
