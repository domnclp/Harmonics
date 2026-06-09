import { Router } from "express";
import { scheduleController } from "../controllers/schedule.controller.js";
import { asyncHandler } from "../middleware/error.middleware.js";

export const scheduleRoutes = Router();

scheduleRoutes.get("/", asyncHandler(scheduleController.list));
scheduleRoutes.post("/", asyncHandler(scheduleController.create));
scheduleRoutes.get("/:id", asyncHandler(scheduleController.get));
scheduleRoutes.patch("/:id", asyncHandler(scheduleController.update));
scheduleRoutes.delete("/:id", asyncHandler(scheduleController.remove));
