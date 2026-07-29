import { Router } from "express";
import { pushController } from "../controllers/push.controller.js";
import { asyncHandler } from "../middleware/error.middleware.js";

export const pushRoutes = Router();

pushRoutes.get("/public-key", pushController.publicKey);
pushRoutes.get("/subscriptions", asyncHandler(pushController.listSubscriptions));
pushRoutes.post("/subscribe", asyncHandler(pushController.subscribe));
pushRoutes.delete("/subscribe", asyncHandler(pushController.unsubscribe));
pushRoutes.get("/preferences", asyncHandler(pushController.getPreferences));
pushRoutes.patch("/preferences", asyncHandler(pushController.updatePreferences));
pushRoutes.post("/test", asyncHandler(pushController.test));
pushRoutes.get("/debug/today", asyncHandler(pushController.debugToday));
