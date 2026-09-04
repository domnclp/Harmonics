import { Router } from "express";
import { notificationsController } from "../controllers/notifications.controller.js";
import { asyncHandler } from "../middleware/error.middleware.js";

export const notificationsRoutes = Router();

notificationsRoutes.post("/tick", asyncHandler(notificationsController.tick));
