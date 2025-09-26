import Aula from "../models/aula.js";
import aulaService from "../services/aulaService.js";

export const createAula = async (req, res) => {
  try {
    const { numero, ubicacion, capacidad, computadoras, tieneProyector } =
      req.body;

    if (!numero || !ubicacion || !capacidad) {
      return res
        .status(400)
        .json({ error: "numero, ubicacion y capacidad son obligatorios" });
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
};

export const getAula = async (req, res) => {
  try {
    const aula = await Aula.findByPk(req.params.id);
    if (!aula) return res.status(404).json({ error: "Aula no encontrada" });
    res.json(aula);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener el aula" });
  }
};

export const getAllAulas = async (req, res) => {
  try {
    const aulas = await aulaService.listAulas();
    res.json(aulas);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener aulas" });
  }
};

export const updateAula = async (req, res) => {
  try {
    const aula = await Aula.findByPk(req.params.id);
    if (!aula) return res.status(404).json({ error: "Aula no encontrada" });

    await aula.update(req.body);
    res.json(aula);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al actualizar el aula" });
  }
};

export const deleteAula = async (req, res) => {
  try {
    const aula = await Aula.findByPk(req.params.id);
    if (!aula) return res.status(404).json({ error: "Aula no encontrada" });

    await aula.destroy();
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al eliminar el aula" });
  }
};
