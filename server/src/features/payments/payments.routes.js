import { Router } from "express";
import * as paymentsController from "./payments.controller.js";
import { requireAuth } from "../../middlewares/auth.middleware.js";

const router = Router();

router.get("/plans", paymentsController.listPlans);
router.get("/", requireAuth, paymentsController.listMine);
router.get("/:id", requireAuth, paymentsController.getOne);

// Learner: subscribe → /learner/payments/checkout
router.post("/checkout", requireAuth, paymentsController.startCheckout);

// Provider webhook callback (no auth — provider signs the payload)
router.post("/webhook", paymentsController.webhook);

export default router;
