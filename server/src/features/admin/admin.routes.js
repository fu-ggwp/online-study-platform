import { Router } from "express";
import * as adminController from "./admin.controller.js";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { requireRole } from "../../middlewares/role.middleware.js";

const router = Router();

// All admin routes require an authenticated admin → /admin/*
router.use(requireAuth, requireRole("admin"));

router.get("/users", adminController.listUsers);
router.get("/users/:id", adminController.getUser);
router.patch("/users/:id", adminController.updateUser);
router.patch("/users/:id/suspend", adminController.suspendUser);
router.patch("/users/:id/reinstate", adminController.reinstateUser);

router.get("/classes", adminController.listClasses);
router.get("/payments", adminController.listPayments);

router.get("/plans", adminController.listPlans);
router.post("/plans", adminController.createPlan);
router.patch("/plans/:id", adminController.updatePlan);
router.delete("/plans/:id", adminController.removePlan);

export default router;
