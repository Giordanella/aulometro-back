/*
import express from "express";
import { requireRole } from "../middlewares/requireRole.js";
import * as userService from "../services/userService.js";

const router = express.Router();


router.get("/busqueda", async (req, res) => {
    //proposito:buscar aulas con paginacion
  try {
    const { page, pageSize } = req.query;
    const data = await aulaService.listAulas({
      page: Number(page) || 1,
      pageSize: Number(pageSize) || 20,
    });
    res.json(data);
  } catch (e) {
    res.status(500).json({ message: "Error al listar aulas" });
  }
});

// GET /aulas/:id
router.get("/:id",  async (req, res) => {
    //proposito:obtiene el aula por su id
  try {
    const aula = await aulaService.findById(req.params.id);
    if (!aula) {
      return res.status(404).json({ error: "aula not found" });
    }
    res.json(aula);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /aulas
router.get("/", async (req, res) => {
    //proposito:devuelve todas las aulas de la base de datos
  try {
    const aulas = await aulaService.findAll();
    res.json(aulas);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /aulas
router.post("/", async (req, res) => {
    //proposito:crea un aula nueva
  try {
    const aula = await aulaService.createAula(req.body);
    res.status(201).json(aula);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /aulas/:id
router.put("/:id", async (req, res) => {
    //proposito:actualiza un aula por id
  try {
    const aula = await userService.updateById(req.params.id, req.body);
    res.json(aula);
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

// DELETE /aulas/:id
router.delete("/:id",  async (req, res) => {
    //proposito:elimina un aula
  try {
    const deleted = await userService.removeById(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: "aula not found" });
    }
    res.status(200).json({ success: "aula successfully deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /aulas
router.delete("/",  async (req, res) => {
    //proposito:elimina todas las aulas
  try {
    const deletedCount = await aulaService.removeAll();
    res.status(200).json({ success: `${deletedCount} users deleted` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

*/