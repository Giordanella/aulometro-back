import * as aulaService from "../services/aulaService.js";

export const createAula = async (req, res) => {
  try {
    const aula = await aulaService.createAula(req.body);
    res.status(201).json(aula);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

export const getAula = async (req, res) => {
  try {
    const aula = await aulaService.findById(req.params.id);
    if (!aula) return res.status(404).json({ error: "Aula no encontrada" });
    res.json(aula);
  } catch (err) {
    res.status(500).json({ error: "Error al obtener el aula" });
  }
};

export const getAllAulas = async (req, res) => {
  try {
    const aulas = await aulaService.findAll(req.query);
    res.json(aulas);
  } catch (err) {
    res.status(500).json({ error: "Error al obtener aulas" });
  }
};

export const updateAula = async (req, res) => {
  try {
    const aula = await aulaService.updateById(req.params.id, req.body);
    res.json(aula);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

export const deleteAula = async (req, res) => {
  try {
    const deleted = await aulaService.removeById(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Aula no encontrada" });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Error al eliminar el aula" });
  }
};
