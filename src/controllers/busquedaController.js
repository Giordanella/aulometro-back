import { buscarAulas as buscarAulasService, findById as findAulaById } from "../services/aulaService.js";
import { verificarConflictos } from "../services/reservaService.js";

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

// Helper para parsear franjas desde la query
function parseSlotsFromQuery(query) {
  const { slots, franja, diaSemana, horaInicio, horaFin } = query || {};

  // 1) slots como JSON: slots='[{"diaSemana":1,"horaInicio":"10:00","horaFin":"12:00"}, ...]'
  if (slots) {
    try {
      const arr = typeof slots === "string" ? JSON.parse(slots) : slots;
      if (!Array.isArray(arr) || arr.length === 0) return [];
      return arr.map((s) => ({
        diaSemana: Number(s.diaSemana),
        horaInicio: s.horaInicio,
        horaFin: s.horaFin,
      })).filter((s) => s.diaSemana && s.horaInicio && s.horaFin);
    } catch (_) {
      return [];
    }
  }

  // 2) franja repetida: franja=1-10:00-12:00&franja=3-14:00-16:00
  if (franja) {
    const list = Array.isArray(franja) ? franja : [franja];
    return list
      .map((f) => String(f).trim())
      .filter(Boolean)
      .map((f) => f.replace(/\s+/g, ""))
      .map((f) => f.split("-") || [])
      .map(([d, hi, hf]) => ({ diaSemana: Number(d), horaInicio: hi, horaFin: hf }))
      .filter((s) => s.diaSemana && s.horaInicio && s.horaFin);
  }

  // 3) triple simple o listas separadas por coma: diaSemana=1,3&horaInicio=10:00,14:00&horaFin=12:00,16:00
  if (diaSemana && horaInicio && horaFin) {
    const dias = String(diaSemana).split(",").map((d) => Number(d.trim()));
    const inicios = String(horaInicio).split(",").map((h) => h.trim());
    const fines = String(horaFin).split(",").map((h) => h.trim());
    if (dias.length === inicios.length && dias.length === fines.length) {
      return dias.map((d, i) => ({ diaSemana: d, horaInicio: inicios[i], horaFin: fines[i] }))
        .filter((s) => s.diaSemana && s.horaInicio && s.horaFin);
    }
    // si no coinciden longitudes, considerar solo el primer trio
    return [{ diaSemana: Number(diaSemana), horaInicio, horaFin }];
  }

  return [];
}

export const buscarAulasDisponibles = async (req, res) => {
  try {
    const { id, aulaId, numero, ubicacion, capacidadMin, computadorasMin, tieneProyector, estado } = req.query || {};

    const slots = parseSlotsFromQuery(req.query);
    if (!slots.length) {
      return res.status(400).json({
        error: "Debe indicar al menos una franja horaria (use 'slots' en JSON, 'franja' repetido o diaSemana/horaInicio/horaFin)",
      });
    }

    // Si viene id/aulaId o numero, simplificamos la búsqueda a esa aula
    let candidatas = [];
    const aulaPk = aulaId ?? id;
    if (aulaPk) {
      const aula = await findAulaById(Number(aulaPk));
      if (!aula) return res.status(404).json({ error: "Aula no encontrada" });
      candidatas = [aula.get ? aula.get({ plain: true }) : aula];
    } else if (numero) {
      const porNumero = await buscarAulasService({ numero });
      if (!porNumero.length) return res.status(404).json({ error: "Aula no encontrada" });
      candidatas = porNumero;
    } else {
      // Filtros opcionales por atributos del aula (no obligatorios)
      const filters = { numero, ubicacion, capacidadMin, computadorasMin, tieneProyector, estado };
      candidatas = await buscarAulasService(filters);
      if (!candidatas.length) {
        return res.status(404).json({ error: "No se encontraron aulas que cumplan los filtros" });
      }
    }

    // Luego chequeamos conflictos por cada franja
    const disponibles = [];
    for (const aula of candidatas) {
      let tieneConflicto = false;
      for (const s of slots) {
        const conflictos = await verificarConflictos({ aulaId: aula.id, diaSemana: s.diaSemana, horaInicio: s.horaInicio, horaFin: s.horaFin });
        if (conflictos && conflictos.length) {
          tieneConflicto = true;
          break;
        }
      }
      if (!tieneConflicto) disponibles.push(aula);
    }

    if (!disponibles.length) {
      return res.status(404).json({ error: "No se encontraron aulas disponibles para las franjas indicadas" });
    }

    res.json(disponibles);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al buscar aulas disponibles" });
    
  }
};
