import type { Request, Response } from "express";
import { z } from "zod";
import { scheduleService } from "../services/schedule.service.js";

const scheduleSchema = z.object({
  name: z.string().min(1).max(120)
});

export const scheduleController = {
  async list(req: Request, res: Response) {
    res.json(await scheduleService.list(req.authUser!.id));
  },

  async create(req: Request, res: Response) {
    const body = scheduleSchema.parse(req.body);
    res.status(201).json(await scheduleService.create(req.authUser!.id, body.name));
  },

  async get(req: Request, res: Response) {
    res.json(await scheduleService.get(req.authUser!.id, req.params.id as string));
  },

  async update(req: Request, res: Response) {
    const body = scheduleSchema.parse(req.body);
    res.json(await scheduleService.update(req.authUser!.id, req.params.id as string, body.name));
  },

  async remove(req: Request, res: Response) {
    await scheduleService.remove(req.authUser!.id, req.params.id as string);
    res.status(204).send();
  }
};
