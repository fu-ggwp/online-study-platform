import { Router } from "express";
import { getRoot, getSupabaseHealth } from "./health.controller.js";

const healthRouter = Router();

healthRouter.get("/", getRoot);
healthRouter.get("/health/supabase", getSupabaseHealth);

export default healthRouter;
