import express from "express";
import { USER_ROLES } from "../config/roles.js";
import { checkRole } from "../middlewares/authMiddleware.js";
import * as controller from "../controllers/reservaController.js";

const router = express.Router();

// Crear una reserva o múltiples franjas para una misma aula
router.post("/", checkRole(USER_ROLES.DOCENTE), controller.postReserva);

// Reservas del usuario autenticado (docente)
router.get("/propias", checkRole(USER_ROLES.DOCENTE), controller.getMias);

// Pendientes (directivo)
router.get("/pendientes", checkRole(USER_ROLES.DIRECTIVO), controller.getPendientes);

// Disponibilidad (cualquier autenticado)
router.get("/disponibilidad", checkRole(USER_ROLES.AUTHENTICATED), controller.getDisponibilidad);

// Rutas por aula (específicas — van antes de '/:id')
router.get("/aulas/:numeroAula/aprobadas", checkRole(USER_ROLES.DIRECTIVO), controller.getReservasAprobadasDeAula);

// --- RUTAS EXAMEN (agrupadas y antes de '/:id') ---
router.post("/examen", checkRole(USER_ROLES.DOCENTE), controller.postReservaExamen);
router.get("/examen/aulas/:numeroAula/aprobadas", checkRole(USER_ROLES.DIRECTIVO), controller.getReservasExamenAprobadasDeAula);
router.post("/examen/:id/aprobar", checkRole(USER_ROLES.DIRECTIVO), controller.postAprobarExamen);
router.post("/examen/:id/rechazar", checkRole(USER_ROLES.DIRECTIVO), controller.postRechazarExamen);
router.post("/examen/:id/cancelar", checkRole(USER_ROLES.DOCENTE), controller.postCancelarExamen);
router.post("/examen/:id/liberar", checkRole(USER_ROLES.DOCENTE), controller.postLiberarExamen);
router.put("/examen/:id", checkRole(USER_ROLES.DOCENTE), controller.putActualizarExamen);

// --- RUTAS QUE USAN ':id' (más genéricas) ---
router.post("/:id/aprobar", checkRole(USER_ROLES.DIRECTIVO), controller.postAprobar);
router.post("/:id/rechazar", checkRole(USER_ROLES.DIRECTIVO), controller.postRechazar);
router.post("/:id/cancelar", checkRole(USER_ROLES.DOCENTE), controller.postCancelar);
router.post("/:id/liberar", checkRole(USER_ROLES.DIRECTIVO), controller.postLiberar);
router.put("/:id", checkRole(USER_ROLES.DOCENTE), controller.putActualizar);

// Obtener por id (al final)
router.get("/:id", checkRole(USER_ROLES.AUTHENTICATED), controller.getById);

export default router;
