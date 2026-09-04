import type { Request, Response } from "express";
import { z } from "zod";
import { blockInstanceService } from "../services/blockInstance.service.js";

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD format");

const findOrCreateSchema = z.object({
  scheduleBlockId: z.string().min(1),
  date: dateSchema
});

export const blockInstanceController = {
  async listByDate(req: Request, res: Response) {
    const date = dateSchema.parse(req.query.date);
    res.json(await blockInstanceService.listByDate(req.authUser!.id, date));
  },

  // A GET must not write. Opening a day now derives it from the template
  // instead of storing a snapshot that can drift; the row appears the moment
  // the user marks something.
  async get(req: Request, res: Response) {
    const date = dateSchema.parse(req.query.date);
    res.json(await blockInstanceService.getForDate(req.authUser!.id, req.params.scheduleBlockId as string, date));
  },

  async findOrCreate(req: Request, res: Response) {
    const body = findOrCreateSchema.parse(req.body);
    res.json(await blockInstanceService.findOrCreate(req.authUser!.id, body.scheduleBlockId, body.date));
  }
};
