import { Router } from "express";
import { userSettingsController } from "../controllers/userSettings.controller.js";
import { asyncHandler } from "../middleware/error.middleware.js";

export const userSettingsRoutes = Router();

userSettingsRoutes.get("/", asyncHandler(userSettingsController.get));
userSettingsRoutes.patch("/", asyncHandler(userSettingsController.update));
