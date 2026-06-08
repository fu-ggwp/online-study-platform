import { Router } from "express";
import * as questionBanksController from "./question-banks.controller.js";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { requireRole } from "../../middlewares/role.middleware.js";

const router = Router();

// Teacher: manage own question banks → /teacher/question-banks
router.get("/", requireAuth, requireRole("teacher"), questionBanksController.listMine);
router.post("/", requireAuth, requireRole("teacher"), questionBanksController.create);
router.get("/:id", requireAuth, questionBanksController.getOne);
router.patch("/:id", requireAuth, requireRole("teacher"), questionBanksController.update);
router.delete("/:id", requireAuth, requireRole("teacher"), questionBanksController.remove);

// Questions within a bank
router.get("/:id/questions", requireAuth, questionBanksController.listQuestions);
router.post("/:id/questions", requireAuth, requireRole("teacher"), questionBanksController.addQuestion);
router.patch("/questions/:qid", requireAuth, requireRole("teacher"), questionBanksController.updateQuestion);

export default router;
