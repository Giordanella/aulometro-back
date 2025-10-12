import express from "express";
import { USER_ROLES } from "../config/roles.js";
import { checkRole } from "../middlewares/authMiddleware.js";
import * as userController from "../controllers/userController.js";

const router = express.Router();

// GET /users/current
router.get("/current", checkRole(USER_ROLES.AUTHENTICATED), userController.getCurrentUser);

// GET /users/docentes
router.get("/docentes", checkRole(USER_ROLES.DIRECTIVO), userController.getDocentes);

// GET /users/:id
router.get("/:id", checkRole(USER_ROLES.DIRECTIVO), userController.getUser);

// GET /users
router.get("/", checkRole(USER_ROLES.DIRECTIVO), userController.getAllUsers);

// POST /users
router.post("/", checkRole(USER_ROLES.PUBLIC), userController.createUser);

// PUT /users/:id
router.put("/:id", checkRole(USER_ROLES.DIRECTIVO), userController.updateUser);

// DELETE /users/:id
router.delete("/:id", checkRole(USER_ROLES.DIRECTIVO), userController.deleteUser);

// DELETE /users
router.delete("/", checkRole(USER_ROLES.DIRECTIVO), userController.deleteAllUsers);

export default router;
