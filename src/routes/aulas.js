import express from "express";
import { USER_ROLES } from "../config/roles.js";
import { checkRole } from "../middlewares/authMiddleware.js";
import * as aulaController from "../controllers/aulaController.js";

const router = express.Router();

// POST /aulas
router.post("/", checkRole(USER_ROLES.PUBLIC), aulaController.createAula);

// GET /aulas
router.get("/", checkRole(USER_ROLES.PUBLIC), aulaController.getAllAulas);

// GET /aulas/:id
router.get("/:id", checkRole(USER_ROLES.PUBLIC), aulaController.getAula);

// PUT /aulas/:id
router.put("/:id", checkRole(USER_ROLES.PUBLIC), aulaController.updateAula);

// DELETE /aulas/:id
router.delete("/:id", checkRole(USER_ROLES.PUBLIC), aulaController.deleteAula);

export default router;
