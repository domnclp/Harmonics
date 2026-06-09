import { Router } from "express";
import { templateController } from "../controllers/template.controller.js";
import { asyncHandler } from "../middleware/error.middleware.js";

export const templateRoutes = Router();

templateRoutes.get("/", asyncHandler(templateController.list));
templateRoutes.post("/", asyncHandler(templateController.create));
templateRoutes.get("/:id", asyncHandler(templateController.get));
templateRoutes.patch("/:id", asyncHandler(templateController.update));
templateRoutes.delete("/:id", asyncHandler(templateController.remove));
