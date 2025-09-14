import express from "express";
import Aula from "../models/aula.js";

const router = express.Router();

// Crear
router.post("/", async (req, res) => {
  try {
    const { numero, ubicacion, capacidad, computadoras, tieneProyector } = req.body;

    if (!numero || !ubicacion || !capacidad) {
      return res.status(400).json({ error: "numero, ubicacion y capacidad son obligatorios" });
    }

    const nuevaAula = await Aula.create({
      numero,
      ubicacion,
      capacidad,
      computadoras: computadoras ?? 0,
      tieneProyector: tieneProyector ?? false,
      estado: "disponible",
    });

    res.status(201).json(nuevaAula);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al crear el aula" });
  }
});

// Listar todas
router.get("/", async (req, res) => {
  try {
    const aulas = await Aula.findAll();
    res.json(aulas);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener aulas" });
  }
});

// Obtener por id
router.get("/:id", async (req, res) => {
  try {
    const aula = await Aula.findByPk(req.params.id);
    if (!aula) return res.status(404).json({ error: "Aula no encontrada" });
    res.json(aula);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener el aula" });
  }
});

// Actualizar
router.put("/:id", async (req, res) => {
  try {
    const aula = await Aula.findByPk(req.params.id);
    if (!aula) return res.status(404).json({ error: "Aula no encontrada" });

    await aula.update(req.body);
    res.json(aula);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al actualizar el aula" });
  }
});

// Eliminar
router.delete("/:id", async (req, res) => {
  try {
    const aula = await Aula.findByPk(req.params.id);
    if (!aula) return res.status(404).json({ error: "Aula no encontrada" });

    await aula.destroy();
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al eliminar el aula" });
  }
});

export default router;
