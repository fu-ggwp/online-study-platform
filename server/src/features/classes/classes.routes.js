import { Router } from "express";
import { getMyClasses } from "./classes.controller.js";
import { requireAuth } from "../../middlewares/auth.middleware.js";

const classesRouter = Router();

// GET /api/classes — teacher sees their own classes
classesRouter.get("/", requireAuth, getMyClasses);

export default classesRouter;
