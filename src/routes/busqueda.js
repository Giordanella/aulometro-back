import express from "express";
import { requireRole } from "../middlewares/requireRole.js";
import * as userService from "../services/userService.js";
import aulaService from "../services/aulaService.js";
import Aula from "../models/aula.js";

const router = express.Router();

//MANTENER ULTIMO BUSCARPORNUMERO

//Obtener por capacidad -> busqueda/capacidad?minCapacidad=n
router.get("/capacidad/:minCapacidad", async (req, res) => {
  try {
    const minCapacidad = Number(req.params.minCapacidad);
    if (!Number.isInteger(minCapacidad) || minCapacidad <= 0) {
      return res.status(400).json({ error: "Numero de capacidad invalido" });
    }
    const aulas = await aulaService.buscarPorCapacidad(minCapacidad);
    if (!aulas.length) {
      return res
        .status(404)
        .json({ error: "No se encontraron aulas con la capacidad solicitada" });
    }
    res.json(aulas);
  } catch (err) {
    console.error(err);
    if (err.status) {
      //<-por el HTTP error
      return res.status(err.status).json({ error: err.message });
    }
    res.status(500).json({ error: "Error al obtener aulas" });
  }
});

// Obtener por numero -> busqueda/n
router.get("/:numero", async (req, res) => {
  try {
    const numero = Number(req.params.numero);
    const aula = await aulaService.buscarPorNumero(numero);
    if (!aula) return res.status(404).json({ error: "Aula no encontrada" });
    res.json(aula);
  } catch (err) {
    console.error(err);

    if (err.status) {
      //<-por el HTTP error
      return res.status(err.status).json({ error: err.message });
    }
    res.status(500).json({ error: "Error al obtener el aula" });
  }
});

export default router;
