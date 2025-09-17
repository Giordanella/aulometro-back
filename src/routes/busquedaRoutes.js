
import express from "express";
import { requireRole } from "../middlewares/requireRole.js";
import * as userService from "../services/userService.js";
import aulaService from "../services/aulaService.js";
import Aula from "../models/aula.js";

const router = express.Router();



// Obtener por numero
router.get("/:numero", async (req, res) => {
  try {
    const aula = await aulaService.buscarPorNumero({ numero: req.params.numero });
    if (!aula) return res.status(404).json({ error: "Aula no encontrada" });
    res.json(aula);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener el aula" });
  }
});



export default router;

