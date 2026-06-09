import { Router } from "express";
import { analyticsController } from "../controllers/analytics.controller.js";
import { asyncHandler } from "../middleware/error.middleware.js";

export const analyticsRoutes = Router();

analyticsRoutes.get("/weekly", asyncHandler(analyticsController.weekly));
analyticsRoutes.get("/templates", asyncHandler(analyticsController.templates));
analyticsRoutes.get("/failure-reasons", asyncHandler(analyticsController.failureReasons));
