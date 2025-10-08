import { Op } from "sequelize";
import Reserva from "../models/reserva.js";
import Aula from "../models/aula.js";
import ReservaHistorial from "../models/reservaHistorial.js";
import { RESERVA_ESTADO, normalizarHora } from "../config/reservas.js";
import sequelize from "../config/db.js";

export async function verificarConflictos({ aulaId, diaSemana, horaInicio, horaFin }) {
  const inicio = normalizarHora(horaInicio);
  const fin = normalizarHora(horaFin);

  const existentes = await Reserva.findAll({
    where: {
      aulaId,
      diaSemana,
      estado: RESERVA_ESTADO.APROBADA,
      [Op.and]: [
        { horaInicio: { [Op.lt]: fin } },
        { horaFin: { [Op.gt]: inicio } },
      ],
    },
    order: [["horaInicio", "ASC"]],
  });

  return existentes.map(r => r.get({ plain: true }));
}

export async function crearReserva({ solicitanteId, aulaId, diaSemana, horaInicio, horaFin, observaciones }, options = {}) {
  const { transaction } = options;
  // Validaciones básicas
  if (!solicitanteId || !aulaId || !diaSemana || !horaInicio || !horaFin) {
    throw new Error("solicitanteId, aulaId, diaSemana, horaInicio y horaFin son obligatorios");
  }

  const aula = await Aula.findByPk(aulaId);
  if (!aula) throw new Error("Aula no encontrada");
  const aulaPlain = aula.get ? aula.get({ plain: true }) : { id: aulaId };

  const conflictos = await verificarConflictos({ aulaId, diaSemana, horaInicio, horaFin });
  if (conflictos.length) {
    const intervalos = conflictos
      .map(c => `${c.horaInicio} - ${c.horaFin}`)
      .join(", ");
    const numero = aulaPlain.numero ?? aulaId;
    throw new Error(`Conflicto: el aula ${numero} ya está reservada en: ${intervalos}`);
  }

  const reserva = await Reserva.create({
    solicitanteId,
    aulaId,
    diaSemana,
    horaInicio: normalizarHora(horaInicio),
    horaFin: normalizarHora(horaFin),
    observaciones,
    estado: RESERVA_ESTADO.PENDIENTE,
  }, { transaction });
  return reserva.get({ plain: true });
}

export async function crearReservaMultiple({ solicitanteId, aulaId, reservas }) {
  if (!Array.isArray(reservas) || reservas.length === 0) {
    throw new Error("'reservas' debe ser un arreglo con al menos un elemento");
  }

  // Validación de solapamientos internos dentro del mismo batch (por diaSemana)
  const normalizadas = reservas.map((r) => ({
    diaSemana: r.diaSemana,
    inicio: normalizarHora(r.horaInicio),
    fin: normalizarHora(r.horaFin),
    observaciones: r.observaciones,
  }));
  for (let i = 0; i < normalizadas.length; i++) {
    for (let j = i + 1; j < normalizadas.length; j++) {
      const a = normalizadas[i];
      const b = normalizadas[j];
      if (a.diaSemana === b.diaSemana && a.inicio < b.fin && b.inicio < a.fin) {
        throw new Error("Conflicto interno en batch: hay franjas que se solapan");
      }
    }
  }

  const t = await sequelize.transaction();
  try {
    const resultados = [];
    for (const r of reservas) {
      resultados.push(
        await crearReserva(
          {
            solicitanteId,
            aulaId,
            diaSemana: r.diaSemana,
            horaInicio: r.horaInicio,
            horaFin: r.horaFin,
            observaciones: r.observaciones,
          },
          { transaction: t }
        )
      );
    }
    await t.commit();
    return resultados;
  } catch (err) {
    await t.rollback();
    throw err;
  }
}

export async function aprobarReserva(reservaId, aprobadorId) {
  const reserva = await Reserva.findByPk(reservaId);
  if (!reserva) throw new Error("Reserva no encontrada");
  const rPlain = reserva.get({ plain: true });
  if (rPlain.estado !== RESERVA_ESTADO.PENDIENTE)
    throw new Error("Solo se pueden aprobar reservas en estado PENDIENTE");

  // Revalidar conflictos a la hora de aprobar
  const conflictos = await verificarConflictos({
    aulaId: rPlain.aulaId,
    diaSemana: rPlain.diaSemana,
    horaInicio: rPlain.horaInicio,
    horaFin: rPlain.horaFin,
  });
  if (conflictos.length) {
    throw new Error("Conflicto detectado al aprobar: el horario fue ocupado");
  }

  await reserva.update({ estado: RESERVA_ESTADO.APROBADA, aprobadoPorId: aprobadorId });
  return reserva.get({ plain: true });
}

export async function rechazarReserva(reservaId, aprobadorId, motivo) {
  const reserva = await Reserva.findByPk(reservaId);
  if (!reserva) throw new Error("Reserva no encontrada");
  const rPlain = reserva.get({ plain: true });
  if (rPlain.estado !== RESERVA_ESTADO.PENDIENTE)
    throw new Error("Solo se pueden rechazar reservas en estado PENDIENTE");
  const cambios = { estado: RESERVA_ESTADO.RECHAZADA, aprobadoPorId: aprobadorId };
  if (motivo) {
    const obs = rPlain.observaciones ? rPlain.observaciones + " | " : "";
    cambios.observaciones = obs + `Motivo rechazo: ${motivo}`;
  }
  await reserva.update(cambios);
  return reserva.get({ plain: true });
}

//Editar una reserva
export async function editarReserva(reservaId, { aulaId, diaSemana, horaInicio, horaFin, observaciones }, usuarioId) {
  // Buscar reserva actual
  const reserva = await Reserva.findByPk(reservaId);
  if (!reserva) throw new Error("Reserva no encontrada");
  const rPlain = reserva.get({ plain: true });

  // Solo el solicitante puede editar y solo si está pendiente
  if (rPlain.solicitanteId !== usuarioId)
    throw new Error("No puedes editar una reserva de otro usuario");
  if (rPlain.estado !== RESERVA_ESTADO.PENDIENTE)
    throw new Error("Solo se pueden editar reservas en estado PENDIENTE");

  // Determinar nuevos valores
  const nuevoAulaId = aulaId ?? rPlain.aulaId;
  const nuevoDiaSemana = diaSemana ?? rPlain.diaSemana;
  const nuevoHoraInicio = horaInicio ?? rPlain.horaInicio;
  const nuevoHoraFin = horaFin ?? rPlain.horaFin;
  const nuevoObservaciones = observaciones ?? rPlain.observaciones;

  // Verificar conflictos (excluyendo la reserva actual)
  const conflictos = await Reserva.findAll({
    where: {
      aulaId: nuevoAulaId,
      diaSemana: nuevoDiaSemana,
      estado: RESERVA_ESTADO.APROBADA,
      id: { [Op.ne]: reservaId },
      [Op.and]: [
        { horaInicio: { [Op.lt]: normalizarHora(nuevoHoraFin) } },
        { horaFin: { [Op.gt]: normalizarHora(nuevoHoraInicio) } },
      ],
    },
  });
  if (conflictos.length) {
    throw new Error("Conflicto: el aula ya está reservada en ese horario");
  }

  // Guardar historial de cambios
  await ReservaHistorial.create({
    reservaId: reserva.id,
    cambios: JSON.stringify({
      antes: {
        aulaId: rPlain.aulaId,
        diaSemana: rPlain.diaSemana,
        horaInicio: rPlain.horaInicio,
        horaFin: rPlain.horaFin,
        observaciones: rPlain.observaciones,
      },
      despues: {
        aulaId: nuevoAulaId,
        diaSemana: nuevoDiaSemana,
        horaInicio: normalizarHora(nuevoHoraInicio),
        horaFin: normalizarHora(nuevoHoraFin),
        observaciones: nuevoObservaciones,
      }
    }),
    fechaCambio: new Date(),
    usuarioId: usuarioId,
  });

  // Actualizar reserva
  await reserva.update({
    aulaId: nuevoAulaId,
    diaSemana: nuevoDiaSemana,
    horaInicio: normalizarHora(nuevoHoraInicio),
    horaFin: normalizarHora(nuevoHoraFin),
    observaciones: nuevoObservaciones,
  });

  return reserva.get({ plain: true });
}

export async function cancelarReserva(reservaId, solicitanteId) {
  const reserva = await Reserva.findByPk(reservaId);
  if (!reserva) throw new Error("Reserva no encontrada");
  const rPlain = reserva.get({ plain: true });
  if (rPlain.solicitanteId !== solicitanteId)
    throw new Error("No puedes cancelar una reserva de otro usuario");
  if (![RESERVA_ESTADO.PENDIENTE, RESERVA_ESTADO.APROBADA].includes(rPlain.estado))
    throw new Error("Solo se pueden cancelar reservas PENDIENTE o APROBADA");
  await reserva.update({ estado: RESERVA_ESTADO.CANCELADA });
  return reserva.get({ plain: true });
}

/**
 * Permite a un directivo desasignar (cancelar) una reserva aprobada.
 * Cambia el estado a CANCELADA y la deja disponible.
 */
export async function desasignarReserva(reservaId, directivoId) {
  const reserva = await Reserva.findByPk(reservaId);
  if (!reserva) throw new Error("Reserva no encontrada");
  const rPlain = reserva.get({ plain: true });
  if (rPlain.estado !== RESERVA_ESTADO.APROBADA)
    throw new Error("Solo se pueden desasignar reservas en estado APROBADA");
  await reserva.update({ estado: RESERVA_ESTADO.CANCELADA, aprobadoPorId: directivoId });
  return reserva.get({ plain: true });
}

export async function listarPendientes() {
  const reservas = await Reserva.findAll({
    where: { estado: RESERVA_ESTADO.PENDIENTE },
    order: [["creadoEn", "ASC"]],
  });
  return reservas.map(r => r.get({ plain: true }));
}

export async function listarMias(userId) {
  const reservas = await Reserva.findAll({
    where: { solicitanteId: userId },
    order: [["creadoEn", "DESC"]],
  });
  return reservas.map(r => r.get({ plain: true }));
}

export async function disponibilidad({ aulaId, diaSemana, horaInicio, horaFin }) {
  const conflictos = await verificarConflictos({ aulaId, diaSemana, horaInicio, horaFin });
  return { available: conflictos.length === 0, conflicts: conflictos };
}

export async function obtenerPorId(id) {
  const r = await Reserva.findByPk(id);
  return r ? r.get({ plain: true }) : null;
}

export async function obtenerHistorialReserva(reservaId) {
  const historial = await ReservaHistorial.findAll({
    where: { reservaId },
    order: [["fechaCambio", "ASC"]],
  });
  return historial.map(h => h.get({ plain: true }));
}

export async function obtenerHistorialEdiciones() {
  const historial = await ReservaHistorial.findAll({
    order: [["fechaCambio", "DESC"]],
  });
  return historial.map(h => h.get({ plain: true }));
}

/**
 * Reserva un aula para examen (permite solapamientos, un solo día).
 * @param {Object} params - { solicitanteId, aulaId, fecha, horaInicio, horaFin, observaciones }
 * @returns {Promise<Object>} reserva creada
 */
export async function reservarAulaExamen({ solicitanteId, aulaId, fecha, horaInicio, horaFin, observaciones }) {
  // Validaciones básicas
  if (!solicitanteId || !aulaId || !fecha || !horaInicio || !horaFin) {
    throw new Error("solicitanteId, aulaId, fecha, horaInicio y horaFin son obligatorios");
  }

  // Verificar que el aula exista
  const aula = await Aula.findByPk(aulaId);
  if (!aula) throw new Error("Aula no encontrada");

  // Validar que la fecha sea solo un día (no rango)
  // (ya que solo se permite un día, no hay rango, solo se guarda la fecha)
  // Si se quisiera validar formato, se puede agregar aquí

  // Crear reserva con estado pendiente, permitiendo solapamientos
  const reserva = await Reserva.create({
    solicitanteId,
    aulaId,
    diaSemana: null, // No aplica para examen
    fechaExamen: fecha,
    horaInicio: normalizarHora(horaInicio),
    horaFin: normalizarHora(horaFin),
    observaciones,
    estado: RESERVA_ESTADO.PENDIENTE,
    esExamen: true,
  });

  return reserva.get({ plain: true });
}
