import { Router } from "express";
import * as authController from "./auth.controller.js";
import { requireAuth } from "../../middlewares/auth.middleware.js";

const router = Router();

router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/logout", authController.logout);
router.post("/forgot-password", authController.forgotPassword);
router.post("/reset-password", authController.resetPassword);
router.get("/me", requireAuth, authController.me);

export default router;
