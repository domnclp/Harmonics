import type { Request, Response } from "express";
import { z } from "zod";
import { journalService } from "../services/journal.service.js";

const journalSchema = z.object({
  content: z.string().max(10000)
});

export const journalController = {
  async update(req: Request, res: Response) {
    const body = journalSchema.parse(req.body);
    res.json(await journalService.update(req.authUser!.id, req.params.id as string, body.content));
  }
};
