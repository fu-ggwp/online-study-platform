import { Router } from "express";
import * as classesController from "./classes.controller.js";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { requireRole } from "../../middlewares/role.middleware.js";

const router = Router();

// Teacher: view & manage own classes  → /teacher/classes
router.get("/", requireAuth, requireRole("teacher"), classesController.listMine);
router.post("/", requireAuth, requireRole("teacher"), classesController.create);
router.get("/:id", requireAuth, classesController.getOne);
router.patch("/:id", requireAuth, requireRole("teacher"), classesController.update);
router.delete("/:id", requireAuth, requireRole("teacher"), classesController.remove);
router.get("/:id/members", requireAuth, requireRole("teacher"), classesController.listMembers);

// Learner: join a class → /learner/classes/join
router.post("/:id/join", requireAuth, requireRole("learner"), classesController.joinClass);
router.patch(
  "/join-requests/:requestId",
  requireAuth,
  requireRole("teacher"),
  classesController.resolveJoinRequest
);

export default router;
