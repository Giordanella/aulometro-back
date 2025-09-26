import express from "express";
import * as aulaController from "../controllers/aulaController.js";

const router = express.Router();

// Crear
router.post("/", aulaController.createAula);

// Listar todas
router.get("/", aulaController.getAllAulas);

// Obtener por id
router.get("/:id", aulaController.getAula);

// Actualizar
router.put("/:id", aulaController.updateAula);

// Eliminar
router.delete("/:id", aulaController.deleteAula);

export default router;
