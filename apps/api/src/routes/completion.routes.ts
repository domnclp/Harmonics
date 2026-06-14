import { Router } from "express";
import { completionController } from "../controllers/completion.controller.js";
import { asyncHandler } from "../middleware/error.middleware.js";

export const completionRoutes = Router();

completionRoutes.patch("/habit-completions/:id", asyncHandler(completionController.updateHabit));
completionRoutes.patch("/task-completions/:id", asyncHandler(completionController.updateTask));
completionRoutes.patch("/block-instances/:instanceId/completions", asyncHandler(completionController.updateInstance));
