import { Router } from "express";
import { USER_ROLES } from "../config/roles.js";
import { checkRole } from "../middlewares/authMiddleware.js";
import * as authController from "../controllers/authController.js";

const router = Router();

// POST /login
router.post("/", checkRole(USER_ROLES.PUBLIC), authController.login);

export default router;
