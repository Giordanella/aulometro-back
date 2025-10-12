import {
  crearReserva,
  crearReservaMultiple,
  aprobarReserva,
  rechazarReserva,
  cancelarReserva,
  listarPendientes,
  listarMias,
  disponibilidad,
  obtenerPorId,
  crearReservaParaExamen,
} from "../services/reservaService.js";
import { parseCreateReservaDTO,
   parseCreateReservaBatchDTO,
    toReservaDTO,
    parseCreateReservaExamenDTO } from "../dtos/dtos.js";


export async function postReserva(req, res) {
  try {
    const solicitanteId = req.user.id;
    const { reservas } = req.body || {};

    if (Array.isArray(reservas)) {
      const parsed = parseCreateReservaBatchDTO(req.body);
      const creadas = await crearReservaMultiple({ solicitanteId, aulaId: parsed.aulaId, reservas: parsed.reservas });
      return res.status(201).json(creadas.map(toReservaDTO));
    }

    const parsed = parseCreateReservaDTO(req.body);
    const creada = await crearReserva({ solicitanteId, ...parsed });
    res.status(201).json(toReservaDTO(creada));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

export async function getMias(req, res) {
  try {
    const userId = req.user.id;
    const mias = await listarMias(userId);
    res.json(mias.map(toReservaDTO));
  } catch (err) {
    res.status(500).json({ error: "Error al obtener mis reservas" });
  }
}

export async function getPendientes(req, res) {
  try {
    const pend = await listarPendientes();
    res.json(pend.map(toReservaDTO));
  } catch (err) {
    res.status(500).json({ error: "Error al obtener reservas pendientes" });
  }
}

export async function postAprobar(req, res) {
  try {
    const aprobadorId = req.user.id;
    const { id } = req.params;
    const r = await aprobarReserva(id, aprobadorId);
    res.json(toReservaDTO(r));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

export async function postRechazar(req, res) {
  try {
    const aprobadorId = req.user.id;
    const { id } = req.params;
    const { motivo } = req.body || {};
    const r = await rechazarReserva(id, aprobadorId, motivo);
    res.json(toReservaDTO(r));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

export async function postCancelar(req, res) {
  try {
    const solicitanteId = req.user.id;
    const { id } = req.params;
    const r = await cancelarReserva(id, solicitanteId);
    res.json(toReservaDTO(r));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

export async function getDisponibilidad(req, res) {
  try {
    const { aulaId, diaSemana, horaInicio, horaFin } = req.query;
    const data = await disponibilidad({ aulaId: Number(aulaId), diaSemana: Number(diaSemana), horaInicio, horaFin });
    res.json({ available: data.available, conflicts: data.conflicts.map(toReservaDTO) });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

export async function getById(req, res) {
  try {
    const r = await obtenerPorId(req.params.id);
    if (!r) return res.status(404).json({ error: "Reserva no encontrada" });
    res.json(toReservaDTO(r));
  } catch (err) {
    res.status(500).json({ error: "Error al obtener la reserva" });
  }
}
export async function postReservaExamen(req, res) {
  try {
    const solicitanteId = req.user.id;
    const parsed = parseCreateReservaExamenDTO(req.body);
    const creada = await crearReservaParaExamen({ solicitanteId, ...parsed });
    res.status(201).json(toReservaDTO(creada));
  } catch (err) {
    res.status(err.status ?? 400).json({ error: err.message });
  }
}
