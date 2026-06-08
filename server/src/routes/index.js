import { Router } from "express";

import healthRouter from "../features/health/health.routes.js";
import authRouter from "../features/auth/auth.routes.js";
import profilesRouter from "../features/profiles/profiles.routes.js";
import classesRouter from "../features/classes/classes.routes.js";
import questionBanksRouter from "../features/question-banks/question-banks.routes.js";
import studySetsRouter from "../features/study-sets/study-sets.routes.js";
import examsRouter from "../features/exams/exams.routes.js";
import analyticsRouter from "../features/analytics/analytics.routes.js";
import paymentsRouter from "../features/payments/payments.routes.js";
import adminRouter from "../features/admin/admin.routes.js";

const router = Router();

router.use("/", healthRouter);
router.use("/api/auth", authRouter);
router.use("/api/profiles", profilesRouter);
router.use("/api/classes", classesRouter);
router.use("/api/question-banks", questionBanksRouter);
router.use("/api/study-sets", studySetsRouter);
router.use("/api/exams", examsRouter);
router.use("/api/analytics", analyticsRouter);
router.use("/api/payments", paymentsRouter);
router.use("/api/admin", adminRouter);

export default router;
