import { Router } from "express";
import { scheduleBlockController } from "../controllers/scheduleBlock.controller.js";
import { asyncHandler } from "../middleware/error.middleware.js";

export const scheduleBlockRoutes = Router();

scheduleBlockRoutes.get("/", asyncHandler(scheduleBlockController.list));
scheduleBlockRoutes.post("/batch", asyncHandler(scheduleBlockController.createMany));
scheduleBlockRoutes.post("/", asyncHandler(scheduleBlockController.create));
scheduleBlockRoutes.get("/:id", asyncHandler(scheduleBlockController.get));
scheduleBlockRoutes.patch("/:id", asyncHandler(scheduleBlockController.update));
scheduleBlockRoutes.delete("/:id", asyncHandler(scheduleBlockController.remove));
