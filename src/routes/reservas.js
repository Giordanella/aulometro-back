import express from "express";
import { USER_ROLES } from "../config/roles.js";
import { checkRole } from "../middlewares/authMiddleware.js";
import * as controller from "../controllers/reservaController.js";

const router = express.Router();

// Crear una reserva o múltiples franjas para una misma aula
router.post("/", checkRole(USER_ROLES.DOCENTE), controller.postReserva);


// Crear reserva de aula para examen (permite solapamientos, un solo día)
router.post("/examen", checkRole(USER_ROLES.DOCENTE), controller.postReservaExamen);

// Reservas del usuario autenticado (docente)
router.get("/propias", checkRole(USER_ROLES.DOCENTE), controller.getMias);

// Pendientes (directivo)
router.get("/pendientes", checkRole(USER_ROLES.DIRECTIVO), controller.getPendientes);

// Aprobar / Rechazar (directivo)
router.post("/:id/aprobar", checkRole(USER_ROLES.DIRECTIVO), controller.postAprobar);
router.post("/:id/rechazar", checkRole(USER_ROLES.DIRECTIVO), controller.postRechazar);

// Desasignar (directivo)
router.post("/:id/desasignar", checkRole(USER_ROLES.DIRECTIVO), controller.postDesasignar);

// Cancelar (dueño)
router.post("/:id/cancelar", checkRole(USER_ROLES.DOCENTE), controller.postCancelar);

// Disponibilidad (cualquier autenticado)
router.get("/disponibilidad", checkRole(USER_ROLES.AUTHENTICATED), controller.getDisponibilidad);

// Obtener por id
router.get("/:id", checkRole(USER_ROLES.AUTHENTICATED), controller.getById);


// Editar reserva (solo dueño y si está pendiente)
router.put("/:id", checkRole(USER_ROLES.DOCENTE), controller.putEditar);



export default router;
