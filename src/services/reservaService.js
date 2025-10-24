import { Op } from "sequelize";
import Reserva from "../models/reserva.js";
import Aula from "../models/aula.js";
import { RESERVA_ESTADO, normalizarHora } from "../config/reservas.js";
import sequelize from "../config/db.js";
import ReservaExamen from "../models/reservaExamen.js";

// Límite diario de creación de reservas por usuario
// Por defecto: 5. En entorno de test, se desactiva para no romper tests existentes.
const MAX_RESERVAS_DIA =
  process.env.NODE_ENV === "test"
    ? Infinity
    : Number(process.env.MAX_RESERVAS_POR_DIA ?? 5);

function rangoDia(fecha = new Date()) {
  const start = new Date(fecha);
  start.setHours(0, 0, 0, 0);
  const end = new Date(fecha);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

async function contarReservasDeHoy(solicitanteId) {
  if (!Number.isFinite(MAX_RESERVAS_DIA)) return 0;
  const { start, end } = rangoDia();
  const [regulares, examenes] = await Promise.all([
    Reserva.count({
      where: {
        solicitanteId,
        creadoEn: { [Op.gte]: start, [Op.lte]: end },
      },
    }),
    ReservaExamen.count({
      where: {
        solicitanteId,
        creadoEn: { [Op.gte]: start, [Op.lte]: end },
      },
    }),
  ]);
  return regulares + examenes;
}
/**
 * Verifica conflictos con reservas REGULARES aprobadas para una franja horaria.
 * @param {{ aulaId: number, diaSemana: number, horaInicio: string, horaFin: string, excluirId?: number }} params
 */
export async function verificarConflictos({ aulaId, diaSemana, horaInicio, horaFin, excluirId }) {
  const inicio = normalizarHora(horaInicio);
  const fin = normalizarHora(horaFin);

  const existentes = await Reserva.findAll({
    where: {
      aulaId,
      diaSemana,
      estado: RESERVA_ESTADO.APROBADA,
      ...(excluirId ? { id: { [Op.ne]: excluirId } } : {}),
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

  // Límite diario de creación
  if (MAX_RESERVAS_DIA !== Infinity) {
    const hechasHoy = await contarReservasDeHoy(solicitanteId);
    if (hechasHoy >= MAX_RESERVAS_DIA) {
      throw new Error(`Límite diario alcanzado: máximo ${MAX_RESERVAS_DIA} reservas por día`);
    }
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

  // Límite diario de creación (considera el tamaño del batch)
  if (MAX_RESERVAS_DIA !== Infinity) {
    const hechasHoy = await contarReservasDeHoy(solicitanteId);
    if (hechasHoy + reservas.length > MAX_RESERVAS_DIA) {
      throw new Error(`Límite diario alcanzado: máximo ${MAX_RESERVAS_DIA} reservas por día`);
    }
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

export async function actualizarReserva(reservaId, solicitanteId, { diaSemana, horaInicio, horaFin, observaciones }) {
  const reserva = await Reserva.findByPk(reservaId);
  if (!reserva) throw new Error("Reserva no encontrada");
  const rPlain = reserva.get({ plain: true });
  if (rPlain.solicitanteId !== solicitanteId)
    throw new Error("No puedes editar una reserva de otro usuario");
  if (![RESERVA_ESTADO.PENDIENTE, RESERVA_ESTADO.APROBADA].includes(rPlain.estado))
    throw new Error("Solo se pueden editar reservas PENDIENTE o APROBADA");

  // Validar conflictos contra otras aprobadas (excluyéndome)
  const conflictos = await verificarConflictos({
    aulaId: rPlain.aulaId,
    diaSemana,
    horaInicio,
    horaFin,
    excluirId: reservaId,
  });
  if (conflictos.length) {
    const intervalos = conflictos.map((c) => `${c.horaInicio} - ${c.horaFin}`).join(", ");
    throw new Error(`Conflicto: ya hay reservas aprobadas en: ${intervalos}`);
  }

  await reserva.update({
    diaSemana,
    horaInicio: normalizarHora(horaInicio),
    horaFin: normalizarHora(horaFin),
    observaciones,
    estado: RESERVA_ESTADO.PENDIENTE,
    aprobadoPorId: null,
  });
  return reserva.get({ plain: true });
}

export async function listarPendientes() {
  // Traer pendientes de reservas regulares y de examen
  const [regulares, examenes] = await Promise.all([
    Reserva.findAll({
      where: { estado: RESERVA_ESTADO.PENDIENTE },
      order: [["creadoEn", "ASC"]],
    }),
    ReservaExamen.findAll({
      where: { estado: RESERVA_ESTADO.PENDIENTE },
      order: [["creadoEn", "ASC"]],
    }),
  ]);

  // Unificar en un solo arreglo y ordenar por fecha de creación ascendente
  const all = [...regulares, ...examenes]
    .map((r) => r.get({ plain: true }))
    .sort((a, b) => new Date(a.creadoEn).getTime() - new Date(b.creadoEn).getTime());

  return all;
}

export async function listarMias(userId) {
  // Traer reservas propias del usuario tanto regulares como de examen
  const [regulares, examenes] = await Promise.all([
    Reserva.findAll({
      where: { solicitanteId: userId },
      order: [["creadoEn", "DESC"]],
    }),
    ReservaExamen.findAll({
      where: { solicitanteId: userId },
      order: [["creadoEn", "DESC"]],
    }),
  ]);

  // Unificar en un solo arreglo y ordenar por fecha de creación descendente
  const all = [...regulares, ...examenes]
    .map((r) => r.get({ plain: true }))
    .sort((a, b) => new Date(b.creadoEn).getTime() - new Date(a.creadoEn).getTime());

  return all;
}

export async function disponibilidad({ aulaId, diaSemana, horaInicio, horaFin }) {
  const conflictos = await verificarConflictos({ aulaId, diaSemana, horaInicio, horaFin });
  return { available: conflictos.length === 0, conflicts: conflictos };
}

export async function obtenerPorId(id) {
  const r = await Reserva.findByPk(id);
  if (r) return r.get({ plain: true });
  const e = await ReservaExamen.findByPk(id);
  return e ? e.get({ plain: true }) : null;
}




export async function crearReservaParaExamen(
  { solicitanteId, aulaId, fecha, horaInicio, horaFin, materia, mesa, observaciones },
  options = {}
) {
  const { transaction } = options;

  // Validaciones mínimas
  if (!solicitanteId || !aulaId || !fecha || !horaInicio || !horaFin) {
    throw new Error("solicitanteId, aulaId, fecha, horaInicio y horaFin son obligatorios");
  }

  // Límite diario de creación
  if (MAX_RESERVAS_DIA !== Infinity) {
    const hechasHoy = await contarReservasDeHoy(solicitanteId);
    if (hechasHoy >= MAX_RESERVAS_DIA) {
      throw new Error(`Límite diario alcanzado: máximo ${MAX_RESERVAS_DIA} reservas por día`);
    }
  }

  const ini = normalizarHora(horaInicio);
  const fin = normalizarHora(horaFin);
  if (ini === fin) throw new Error("La franja no puede tener duración 0");
  if (ini > fin) throw new Error("horaInicio debe ser menor a horaFin");

  // Opcional: verificar que el aula exista (si tenés FK, la DB lo hará fallar)
  const aula = await Aula.findByPk(aulaId, { transaction });
  if (!aula) throw new Error("Aula no encontrada");

  // Derivar diaSemana desde la fecha (1..7 Lunes..Domingo)
  const d = new Date(`${fecha}T00:00:00`);
  const dow = d.getDay(); // 0=Dom..6=Sab
  const diaSemana = dow === 0 ? 7 : dow; // 1..7

  // Crear reserva de EXAMEN (sin verificar conflictos)
  const reservaExamen = await ReservaExamen.create(
    {
      solicitanteId,
      aulaId,
      fecha,
      diaSemana,
      horaInicio: ini,
      horaFin: fin,
      materia: materia ?? null,
      mesa: mesa ?? null,
      observaciones: observaciones ?? null,
      estado: RESERVA_ESTADO.PENDIENTE, // explícito por si en el modelo cambia el default
    },
    { transaction }
  );

  return reservaExamen.get({ plain: true });
}

// ============
// Examen flows
// ============

export async function verificarConflictosExamen({ aulaId, fecha, horaInicio, horaFin }) {
  const inicio = normalizarHora(horaInicio);
  const fin = normalizarHora(horaFin);

  const existentes = await ReservaExamen.findAll({
    where: {
      aulaId,
      fecha,
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

export async function actualizarReservaExamen(reservaId, solicitanteId, { fecha, horaInicio, horaFin, materia, mesa, observaciones }) {
  const reserva = await ReservaExamen.findByPk(reservaId);
  if (!reserva) throw new Error("Reserva de examen no encontrada");
  const rPlain = reserva.get({ plain: true });
  if (rPlain.solicitanteId !== solicitanteId)
    throw new Error("No puedes editar una reserva de otro usuario");
  if (![RESERVA_ESTADO.PENDIENTE, RESERVA_ESTADO.APROBADA].includes(rPlain.estado))
    throw new Error("Solo se pueden editar reservas PENDIENTE o APROBADA");

  // Derivar diaSemana desde la fecha
  const d = new Date(`${fecha}T00:00:00`);
  const dow = d.getDay(); // 0..6
  const diaSemana = dow === 0 ? 7 : dow;

  await reserva.update({
    fecha,
    diaSemana,
    horaInicio: normalizarHora(horaInicio),
    horaFin: normalizarHora(horaFin),
    materia: materia ?? null,
    mesa: mesa ?? null,
    observaciones,
    estado: RESERVA_ESTADO.PENDIENTE,
    aprobadoPorId: null,
  });
  return reserva.get({ plain: true });
}

export async function aprobarReservaExamen(reservaId, aprobadorId) {
  const reserva = await ReservaExamen.findByPk(reservaId);
  if (!reserva) throw new Error("Reserva de examen no encontrada");
  const rPlain = reserva.get({ plain: true });
  if (rPlain.estado !== RESERVA_ESTADO.PENDIENTE)
    throw new Error("Solo se pueden aprobar reservas en estado PENDIENTE");

  // Revalidar conflictos a la hora de aprobar contra otras de examen
  const conflictos = await verificarConflictosExamen({
    aulaId: rPlain.aulaId,
    fecha: rPlain.fecha,
    horaInicio: rPlain.horaInicio,
    horaFin: rPlain.horaFin,
  });
  if (conflictos.length) {
    throw new Error("Conflicto detectado al aprobar: el horario fue ocupado");
  }

  await reserva.update({ estado: RESERVA_ESTADO.APROBADA, aprobadoPorId: aprobadorId });
  return reserva.get({ plain: true });
}

export async function rechazarReservaExamen(reservaId, aprobadorId, motivo) {
  const reserva = await ReservaExamen.findByPk(reservaId);
  if (!reserva) throw new Error("Reserva de examen no encontrada");
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

export async function cancelarReservaExamen(reservaId, solicitanteId) {
  const reserva = await ReservaExamen.findByPk(reservaId);
  if (!reserva) throw new Error("Reserva de examen no encontrada");
  const rPlain = reserva.get({ plain: true });
  if (rPlain.solicitanteId !== solicitanteId)
    throw new Error("No puedes cancelar una reserva de otro usuario");
  if (![RESERVA_ESTADO.PENDIENTE, RESERVA_ESTADO.APROBADA].includes(rPlain.estado))
    throw new Error("Solo se pueden cancelar reservas PENDIENTE o APROBADA");
  await reserva.update({ estado: RESERVA_ESTADO.CANCELADA });
  return reserva.get({ plain: true });
}

export async function listarReservasAprobadasDeAula(aulaId) {
  if (!aulaId) throw new Error("aulaId es requerido");

  const id = Number(aulaId);
  if (Number.isNaN(id)) throw new Error("aulaId inválido");

  return await Reserva.findAll({
    where: {
      aulaId: id,
      estado: RESERVA_ESTADO.APROBADA,
    },
    order: [
      ["diaSemana", "ASC"],
      ["horaInicio", "ASC"],
    ],
  });
}

export async function listarReservasExamenAprobadasDeAula(aulaId) {
  if (!aulaId) throw new Error("aulaId es requerido");

  const id = Number(aulaId);
  if (Number.isNaN(id)) throw new Error("aulaId inválido");

  // Obtener reservas de examen aprobadas para el aula, ordenadas por fecha y horaInicio
  return await ReservaExamen.findAll({
    where: {
      aulaId: id,
      estado: RESERVA_ESTADO.APROBADA,
    },
    order: [
      // Primero por fecha (DATEONLY), luego por hora de inicio
      ["fecha", "ASC"],
      ["horaInicio", "ASC"],
    ],
  });
}

export async function liberarReserva(reservaId) {
  const reserva = await Reserva.findByPk(reservaId);
  if (!reserva) {
    throw new Error("Reserva no encontrada");
  }

  if (reserva.estado !== RESERVA_ESTADO.APROBADA) {
    throw new Error("Solo se pueden liberar reservas aprobadas");
  }

  await reserva.update({ estado: RESERVA_ESTADO.CANCELADA });
  return reserva.get({ plain: true });
}

export async function liberarReservaExamen(reservaId) {
  const reserva = await ReservaExamen.findByPk(reservaId);
  if (!reserva) {
    throw new Error("Reserva de examen no encontrada");
  }

  if (reserva.estado !== RESERVA_ESTADO.APROBADA) {
    throw new Error("Solo se pueden liberar reservas aprobadas");
  }

  await reserva.update({ estado: RESERVA_ESTADO.CANCELADA });
  return reserva.get({ plain: true });
}
