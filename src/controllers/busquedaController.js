import { buscarAulas as buscarAulasService } from "../services/aulaService.js";

export const buscarAulas = async (req, res) => {
  try {
    console.log("QS →", req.query);
    const aulas = await buscarAulasService(req.query);
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
};
