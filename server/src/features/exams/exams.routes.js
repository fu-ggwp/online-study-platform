import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import {
  createExamSession,
  getAvailableExamSessions,
  getExamDetail,
  getLearnerExamAttempt,
  getLearnerExamDetail,
  getMyExamSessions,
  recordLearnerExamEvent,
  saveLearnerExamAnswer,
  startLearnerExamAttempt,
  submitLearnerExamAttempt,
  updateExamSettings,
} from "./exams.controller.js";

const examsRouter = Router();

// Learner routes must be before /:id routes.
examsRouter.get("/learner", requireAuth, getAvailableExamSessions);
examsRouter.get("/learner/:id", requireAuth, getLearnerExamDetail);
examsRouter.post("/:id/attempts", requireAuth, startLearnerExamAttempt);
examsRouter.get("/attempts/:attemptId", requireAuth, getLearnerExamAttempt);
examsRouter.post("/attempts/:attemptId/answers", requireAuth, saveLearnerExamAnswer);
examsRouter.patch("/attempts/:attemptId/submit", requireAuth, submitLearnerExamAttempt);
examsRouter.post("/attempts/:attemptId/events", requireAuth, recordLearnerExamEvent);

// Collection routes
examsRouter.get("/", requireAuth, getMyExamSessions);
examsRouter.post("/", requireAuth, createExamSession);

// Exam detail and settings routes
examsRouter.get("/:id", requireAuth, getExamDetail);
examsRouter.patch("/:id/settings", requireAuth, updateExamSettings);

export default examsRouter;
