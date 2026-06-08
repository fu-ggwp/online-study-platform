import { Router } from "express";
import * as profilesController from "./profiles.controller.js";
import { requireAuth } from "../../middlewares/auth.middleware.js";

const router = Router();

router.get("/me", requireAuth, profilesController.getMine);
router.patch("/me", requireAuth, profilesController.updateMine);
router.get("/:username", profilesController.getByUsername); // public profile page

export default router;
