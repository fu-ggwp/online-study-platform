import { Router } from "express";
import multer from "multer";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { requireRole } from "../../middlewares/role.middleware.js";
import {
  create,
  generateFromMaterial,
  getById,
  getQuestionById,
  listAssigned,
  listAssignedQuestions,
  list,
  listQuestions,
  remove,
  update,
  updateQuestion,
} from "./question-banks.controller.js";

const questionBanksRouter = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
});

function uploadMaterial(req, res, next) {
  upload.single("material")(req, res, (error) => {
    if (!error) {
      next();
      return;
    }

    const message = error.code === "LIMIT_FILE_SIZE"
      ? "Material file must be 15MB or smaller."
      : "Material file could not be uploaded.";

    res.status(400).json({ message });
  });
}

questionBanksRouter.get("/", requireAuth, requireRole("teacher"), list);
questionBanksRouter.post("/", requireAuth, requireRole("teacher"), create);
questionBanksRouter.post(
  "/generate-from-material",
  requireAuth,
  requireRole("teacher"),
  uploadMaterial,
  generateFromMaterial,
);
questionBanksRouter.get("/assigned", requireAuth, requireRole("teacher"), listAssigned);
questionBanksRouter.get("/assigned/:id/questions", requireAuth, requireRole("teacher"), listAssignedQuestions);
questionBanksRouter.get("/questions/:questionId", requireAuth, requireRole("teacher"), getQuestionById);
questionBanksRouter.patch("/questions/:questionId", requireAuth, requireRole("teacher"), updateQuestion);
questionBanksRouter.get("/:id/questions", requireAuth, requireRole("teacher"), listQuestions);
questionBanksRouter.get("/:id", requireAuth, requireRole("teacher"), getById);
questionBanksRouter.patch("/:id", requireAuth, requireRole("teacher"), update);
questionBanksRouter.delete("/:id", requireAuth, requireRole("teacher"), remove);

export default questionBanksRouter;
