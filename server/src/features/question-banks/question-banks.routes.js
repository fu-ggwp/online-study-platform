import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { requireRole } from "../../middlewares/role.middleware.js";
import { uploadMaterial } from "../../middlewares/upload.middleware.js";
import {
  create,
  generateFromMaterial,
  getById,
  listReady,
  listReadyQuestions,
  list,
  listQuestions,
  remove,
  update,
} from "./question-banks.controller.js";

const questionBanksRouter = Router();

// Collection routes for teacher-owned question banks.
questionBanksRouter.get("/", requireAuth, requireRole("teacher"), list);
questionBanksRouter.post("/", requireAuth, requireRole("teacher"), create);

// AI material generation must run after multer attaches req.file.
questionBanksRouter.post(
  "/generate-from-material",
  requireAuth,
  requireRole("teacher"),
  uploadMaterial,
  generateFromMaterial,
);

// Ready-only routes are used by exam/study-set builders.
questionBanksRouter.get("/ready", requireAuth, requireRole("teacher"), listReady);
questionBanksRouter.get(
  "/ready/:id/questions",
  requireAuth,
  requireRole("teacher"),
  listReadyQuestions,
);

// Detail routes for bank metadata and editable question rows.
questionBanksRouter.get("/:id/questions", requireAuth, requireRole("teacher"), listQuestions);
questionBanksRouter.get("/:id", requireAuth, requireRole("teacher"), getById);
questionBanksRouter.patch("/:id", requireAuth, requireRole("teacher"), update);
questionBanksRouter.delete("/:id", requireAuth, requireRole("teacher"), remove);

export default questionBanksRouter;
