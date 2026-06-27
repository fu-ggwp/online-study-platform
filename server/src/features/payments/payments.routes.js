import { Router } from "express";
import * as paymentsController from "./payments.controller.js";

const router = Router();

router.get("/plans", paymentsController.listPlans);

export default router;
