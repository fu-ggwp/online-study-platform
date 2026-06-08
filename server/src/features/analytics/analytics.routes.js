import { Router } from "express";
import * as analyticsController from "./analytics.controller.js";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { requireRole } from "../../middlewares/role.middleware.js";

const router = Router();

router.get("/reports", requireAuth, analyticsController.listReports);
router.get("/reports/:id", requireAuth, analyticsController.getReport);

// Teacher: class performance → /teacher/analytics/classes/:classId
router.post(
  "/classes/:classId/report",
  requireAuth,
  requireRole("teacher"),
  analyticsController.generateClassReport
);

// Learner: personal progress → /learner/analytics/progress
router.post(
  "/progress",
  requireAuth,
  requireRole("learner"),
  analyticsController.generateLearnerReport
);

export default router;
