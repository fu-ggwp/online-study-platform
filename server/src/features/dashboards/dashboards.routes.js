import { Router } from "express";

import { requireAuth } from "../../middlewares/auth.middleware.js";
import { requireRole } from "../../middlewares/role.middleware.js";
import { getLearnerDashboard, getTeacherDashboard } from "./dashboards.controller.js";

export const dashboardsRouter = Router();

// Role-specific dashboard endpoints share auth but return different card payloads.
dashboardsRouter.get("/learner", requireAuth, requireRole("learner"), getLearnerDashboard);
dashboardsRouter.get("/teacher", requireAuth, requireRole("teacher"), getTeacherDashboard);

export default dashboardsRouter;
