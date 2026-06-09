import type { Request, Response } from "express";
import { z } from "zod";
import { templateService } from "../services/template.service.js";

const itemSchema = z.object({
  title: z.string().min(1).max(160),
  sortOrder: z.number().int().min(0).optional()
});

const templateSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(500).nullable().optional(),
  color: z.string().min(1).max(48),
  icon: z.string().min(1).max(48),
  category: z.string().min(1).max(80),
  journalPrompt: z.string().max(500).nullable().optional(),
  isTemporary: z.boolean().optional(),
  habits: z.array(itemSchema).default([]),
  tasks: z.array(itemSchema).default([])
});

const updateTemplateSchema = templateSchema.partial();

export const templateController = {
  async list(req: Request, res: Response) {
    res.json(await templateService.list(req.authUser!.id));
  },

  async create(req: Request, res: Response) {
    const body = templateSchema.parse(req.body);
    res.status(201).json(await templateService.create(req.authUser!.id, body));
  },

  async get(req: Request, res: Response) {
    res.json(await templateService.get(req.authUser!.id, req.params.id as string));
  },

  async update(req: Request, res: Response) {
    const body = updateTemplateSchema.parse(req.body);
    res.json(await templateService.update(req.authUser!.id, req.params.id as string, body));
  },

  async remove(req: Request, res: Response) {
    await templateService.remove(req.authUser!.id, req.params.id as string);
    res.status(204).send();
  }
};
