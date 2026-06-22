import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js";
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

questionBanksRouter.get("/", requireAuth, list);
questionBanksRouter.post("/", requireAuth, create);
questionBanksRouter.post(
  "/generate-from-material",
  requireAuth,
  uploadMaterial,
  generateFromMaterial,
);
questionBanksRouter.get("/ready", requireAuth, listReady);
questionBanksRouter.get(
  "/ready/:id/questions",
  requireAuth,
  listReadyQuestions,
);
questionBanksRouter.get("/:id/questions", requireAuth, listQuestions);
questionBanksRouter.get("/:id", requireAuth, getById);
questionBanksRouter.patch("/:id", requireAuth, update);
questionBanksRouter.delete("/:id", requireAuth, remove);

export default questionBanksRouter;
