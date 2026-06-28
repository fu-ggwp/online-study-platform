import { Router } from "express";
import { me, switchRole, updateMe } from "./auth.controller.js";
import { requireAuth } from "../../middlewares/auth.middleware.js";

const authRouter = Router();

authRouter.use(requireAuth);

authRouter.get("/me", me);
authRouter.patch("/me", updateMe);
authRouter.patch("/role", switchRole);

export default authRouter;
