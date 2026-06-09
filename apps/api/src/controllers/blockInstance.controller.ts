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

  async get(req: Request, res: Response) {
    const date = dateSchema.parse(req.query.date);
    res.json(await blockInstanceService.findOrCreate(req.authUser!.id, req.params.scheduleBlockId as string, date));
  },

  async findOrCreate(req: Request, res: Response) {
    const body = findOrCreateSchema.parse(req.body);
    res.json(await blockInstanceService.findOrCreate(req.authUser!.id, body.scheduleBlockId, body.date));
  }
};
