import { Router } from "express";
import { journalController } from "../controllers/journal.controller.js";
import { asyncHandler } from "../middleware/error.middleware.js";

export const journalRoutes = Router();

journalRoutes.patch("/:id", asyncHandler(journalController.update));
