import express from "express";
import { requireRole } from "../middlewares/requireRole.js";
import * as userService from "../services/userService.js";
import { buscarAulas } from "../services/aulaService.js";
import Aula from "../models/aula.js";

const router = express.Router();

//GET /busqueda/aulas?...
/** Filtros admitidos (todos opcionales, vía query string):
 * numero, ubicacion (like), capacidadMin,
 * computadorasMin, tieneProyector, estado*/
//Ejemplo:
//http://localhost:3000/busqueda/aulas?numero=210&ubicacion=Dep2&capacidadMin=10&computadorasMin=0&tieneProyector=true
router.get("/aulas", async (req, res) => {
  try {
    console.log("QS →", req.query);
    const aulas = await buscarAulas(req.query);
    if (!aulas.length) {
      return res
        .status(404)
        .json({ error: "No se encontraron aulas disponibles" });
    }
    res.json(aulas);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener aulas" });
  }
});

export default router;
