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
  editarReserva,
  reservarAulaExamen,
  desasignarReserva,
} from "../services/reservaService.js";
import { parseCreateReservaDTO, parseCreateReservaBatchDTO, toReservaDTO } from "../dtos/dtos.js";

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
  res.json({
  mensaje: "Su solicitud se ha realizado con éxito, se estará evaluando en los próximos días."
});
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
export async function putEditar(req, res) {
  try {
    const usuarioId = req.user.id;
    const { id } = req.params;
    const datos = req.body;
    const r = await editarReserva(id, datos, usuarioId);
    res.json(toReservaDTO(r));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

export async function postReservaExamen(req, res) {
  try {
    const solicitanteId = req.user.id;
    const { aulaId, fecha, horaInicio, horaFin, observaciones } = req.body;
    await reservarAulaExamen({ solicitanteId, aulaId, fecha, horaInicio, horaFin, observaciones });
    res.status(201).json({ mensaje: "Su solicitud se ha realizado con éxito, se estará evaluando en los próximos días." });
  } catch (err) {
    res.status(400).json({ error: "Hubo un error al realizar la solicitud de reserva" });
  }
}

export async function postDesasignar(req, res) {
  try {
    const directivoId = req.user.id;
    const { id } = req.params;
    const r = await desasignarReserva(id, directivoId);
    res.json({ mensaje: "La reserva fue desasignada y el aula está disponible.", reserva: r });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}
