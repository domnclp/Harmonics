import { Router } from "express";
import { blockInstanceController } from "../controllers/blockInstance.controller.js";
import { asyncHandler } from "../middleware/error.middleware.js";

export const blockInstanceRoutes = Router();

blockInstanceRoutes.get("/", asyncHandler(blockInstanceController.listByDate));
blockInstanceRoutes.post("/find-or-create", asyncHandler(blockInstanceController.findOrCreate));
blockInstanceRoutes.get("/:scheduleBlockId", asyncHandler(blockInstanceController.get));
