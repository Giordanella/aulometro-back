import * as service from "../services/reservaService.js";
import * as dto from "../dtos/dtos.js";
import { getByNumero } from "../services/aulaService.js";

export async function postReserva(req, res) {
  try {
    const solicitanteId = req.user.id;
    const { reservas } = req.body || {};

    if (Array.isArray(reservas)) {
      const parsed = dto.parseCreateReservaBatchDTO(req.body);
      const creadas = await service.crearReservaMultiple({
        solicitanteId,
        aulaId: parsed.aulaId,
        reservas: parsed.reservas,
      });
      return res.status(201).json(creadas.map(dto.toReservaDTO));
    }

    const parsed = dto.parseCreateReservaDTO(req.body);
    const creada = await service.crearReserva({ solicitanteId, ...parsed });
    res.status(201).json(dto.toReservaDTO(creada));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

export async function getMias(req, res) {
  try {
    const userId = req.user.id;
    const mias = await service.listarMias(userId);
    res.json(mias.map(dto.toReservaDTO));
  } catch {
    res.status(500).json({ error: "Error al obtener mis reservas" });
  }
}

export async function getPendientes(req, res) {
  try {
    const pend = await service.listarPendientes();
    res.json(pend.map(dto.toReservaDTO));
  } catch {
    res.status(500).json({ error: "Error al obtener reservas pendientes" });
  }
}

export async function postAprobar(req, res) {
  try {
    const aprobadorId = req.user.id;
    const { id } = req.params;
    const r = await service.aprobarReserva(id, aprobadorId);
    res.json(dto.toReservaDTO(r));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

export async function postRechazar(req, res) {
  try {
    const aprobadorId = req.user.id;
    const { id } = req.params;
    const { motivo } = req.body || {};
    const r = await service.rechazarReserva(id, aprobadorId, motivo);
    res.json(dto.toReservaDTO(r));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

export async function postCancelar(req, res) {
  try {
    const solicitanteId = req.user.id;
    const { id } = req.params;
    const r = await service.cancelarReserva(id, solicitanteId);
    res.json(dto.toReservaDTO(r));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

export async function putActualizar(req, res) {
  try {
    const solicitanteId = req.user.id;
    const { id } = req.params;
    const parsed = dto.parseUpdateReservaDTO(req.body);
    const r = await service.actualizarReserva(id, solicitanteId, parsed);
    res.json(dto.toReservaDTO(r));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

export async function getDisponibilidad(req, res) {
  try {
    const { aulaId, diaSemana, horaInicio, horaFin } = req.query;
    const data = await service.disponibilidad({
      aulaId: Number(aulaId),
      diaSemana: Number(diaSemana),
      horaInicio,
      horaFin,
    });
    res.json({
      available: data.available,
      conflicts: data.conflicts.map(dto.toReservaDTO),
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

export async function getById(req, res) {
  try {
    const r = await service.obtenerPorId(req.params.id);
    if (!r) return res.status(404).json({ error: "Reserva no encontrada" });
    res.json(dto.toReservaDTO(r));
  } catch {
    res.status(500).json({ error: "Error al obtener la reserva" });
  }
}

export async function postReservaExamen(req, res) {
  try {
    const solicitanteId = req.user.id;
    const parsed = dto.parseCreateReservaExamenDTO(req.body);
    const creada = await service.crearReservaParaExamen({
      solicitanteId,
      ...parsed,
    });
    res.status(201).json(dto.toReservaDTO(creada));
  } catch (err) {
    res.status(err.status ?? 400).json({ error: err.message });
  }
}

export async function postAprobarExamen(req, res) {
  try {
    const aprobadorId = req.user.id;
    const { id } = req.params;
    const r = await service.aprobarReservaExamen(id, aprobadorId);
    res.json(dto.toReservaDTO(r));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

export async function postRechazarExamen(req, res) {
  try {
    const aprobadorId = req.user.id;
    const { id } = req.params;
    const { motivo } = req.body || {};
    const r = await service.rechazarReservaExamen(id, aprobadorId, motivo);
    res.json(dto.toReservaDTO(r));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

export async function postCancelarExamen(req, res) {
  try {
    const solicitanteId = req.user.id;
    const { id } = req.params;
    const r = await service.cancelarReservaExamen(id, solicitanteId);
    res.json(dto.toReservaDTO(r));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

export async function putActualizarExamen(req, res) {
  try {
    const solicitanteId = req.user.id;
    const { id } = req.params;
    const parsed = dto.parseUpdateReservaExamenDTO(req.body);
    const r = await service.actualizarReservaExamen(id, solicitanteId, parsed);
    res.json(dto.toReservaDTO(r));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

export async function getReservasAprobadasDeAula(req, res) {
  try {
    const { numeroAula } = req.params;
    const aula = await getByNumero(numeroAula);

    if (!aula) {
      return res.status(404).json({ error: `Aula ${numeroAula} no encontrada` });
    }

    const data = await service.listarReservasAprobadasDeAula(aula.id);
    res.json(data.map(dto.toReservaDTO));
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

export async function getReservasExamenAprobadasDeAula(req, res) {
  try {
    const { numeroAula } = req.params;
    const aula = await getByNumero(numeroAula);

    if (!aula) {
      return res.status(404).json({ error: `Aula ${numeroAula} no encontrada` });
    }

    const data = await service.listarReservasExamenAprobadasDeAula(aula.id);
    res.json(data.map(dto.toReservaDTO));
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}
