import express from "express";
import { USER_ROLES } from "../config/roles.js";
import { checkRole } from "../middlewares/authMiddleware.js";
import * as busquedaController from "../controllers/busquedaController.js";

const router = express.Router();

/**
 * GET /busqueda/aulas
 * Ejemplo de query:
 * http://localhost:3000/busqueda/aulas?
 *   numero=210&
 *   ubicacion=Dep2&
 *   capacidadMin=10&
 *   computadorasMin=0&
 *   tieneProyector=true
 */
router.get("/aulas", checkRole(USER_ROLES.AUTHENTICATED), busquedaController.buscarAulas);

export default router;
