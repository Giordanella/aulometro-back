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

/**
 * GET /busqueda/aulas-disponibles
 * Permite filtrar aulas por atributos y además exigir que estén libres en una o más franjas horarias.
 * Formatos aceptados para franjas en query:
 * - slots: JSON string con array de objetos [{ diaSemana, horaInicio, horaFin }, ...]
 *   Ej: slots=[{"diaSemana":1,"horaInicio":"10:00","horaFin":"12:00"},{"diaSemana":3,"horaInicio":"14:00","horaFin":"16:00"}]
 * - franja: parámetro repetido con formato d-hh:mm-hh:mm (p.ej. franja=1-10:00-12:00&franja=3-14:00-16:00)
 * - diaSemana, horaInicio, horaFin: pueden ser únicos o listas separadas por coma de igual longitud.
 */
router.get(
	"/aulas-disponibles",
	checkRole(USER_ROLES.AUTHENTICATED),
	busquedaController.buscarAulasDisponibles
);

export default router;
