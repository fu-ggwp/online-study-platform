import { Router } from "express";
import * as examsController from "./exams.controller.js";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { requireRole } from "../../middlewares/role.middleware.js";

const router = Router();

// Teacher: manage own exams → /teacher/exams
router.get("/", requireAuth, requireRole("teacher"), examsController.listMine);
router.post("/", requireAuth, requireRole("teacher"), examsController.create);
router.get("/:id", requireAuth, examsController.getOne);
router.patch("/:id", requireAuth, requireRole("teacher"), examsController.update);
router.delete("/:id", requireAuth, requireRole("teacher"), examsController.remove);
router.get("/:id/attempts", requireAuth, requireRole("teacher"), examsController.listAttempts);

// Class-scoped exam list → /learner/classes/:classId/exams
router.get("/class/:classId", requireAuth, examsController.listForClass);

// Learner: take exams → /learner/exams
router.post("/:id/attempts", requireAuth, requireRole("learner"), examsController.startAttempt);
router.get("/attempts/mine", requireAuth, requireRole("learner"), examsController.listMyAttempts);
router.post(
  "/attempts/:attemptId/answers",
  requireAuth,
  requireRole("learner"),
  examsController.submitAnswer
);
router.patch(
  "/attempts/:attemptId/submit",
  requireAuth,
  requireRole("learner"),
  examsController.submitAttempt
);
router.get(
  "/attempts/:attemptId/results",
  requireAuth,
  requireRole("learner"),
  examsController.getAttemptResults
);

export default router;
