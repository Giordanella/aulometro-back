export const toUserDTO = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
});

// =========================
// Reservas DTOs / Parsers
// =========================

const TIME_REGEX = /^\d{2}:\d{2}(:\d{2})?$/;

/**
 * Crea un error HTTP tipado para checkJs
 * @param {number} status
 * @param {string} message
 * @returns {Error & { status: number }}
 */
export function httpError(status, message) {
  const err = new Error(message);
  // @ts-ignore - extendemos el objeto error en JS
  err.status = status;
  return /** @type {Error & { status: number }} */ (err);
}

export function parseCreateReservaDTO(body) {
  const errors = [];
  const aulaId = Number(body?.aulaId);
  const diaSemana = Number(body?.diaSemana);
  const horaInicio = String(body?.horaInicio ?? "");
  const horaFin = String(body?.horaFin ?? "");
  const observaciones = body?.observaciones != null ? String(body.observaciones) : undefined;

  if (!Number.isFinite(aulaId) || aulaId <= 0) errors.push("aulaId inválido");
  if (!Number.isFinite(diaSemana) || diaSemana < 1 || diaSemana > 7) errors.push("diaSemana debe estar entre 1 y 7");
  if (!TIME_REGEX.test(horaInicio)) errors.push("horaInicio inválida (formato HH:mm o HH:mm:ss)");
  if (!TIME_REGEX.test(horaFin)) errors.push("horaFin inválida (formato HH:mm o HH:mm:ss)");

  if (errors.length) throw httpError(400, errors.join(", "));

  return { aulaId, diaSemana, horaInicio, horaFin, observaciones };
}

export function parseCreateReservaBatchDTO(body) {
  const errors = [];
  const aulaId = Number(body?.aulaId);
  const reservas = body?.reservas;
  if (!Number.isFinite(aulaId) || aulaId <= 0) errors.push("aulaId inválido");
  if (!Array.isArray(reservas) || reservas.length === 0) errors.push("'reservas' debe ser un arreglo no vacío");

  if (errors.length) throw httpError(400, errors.join(", "));

  const parsed = reservas.map((r) => {
    const item = parseCreateReservaDTO({ ...r, aulaId });
    // omit aulaId at item-level for clarity in service, but keep dia/hora/obs
    return {
      diaSemana: item.diaSemana,
      horaInicio: item.horaInicio,
      horaFin: item.horaFin,
      observaciones: item.observaciones,
    };
  });

  return { aulaId, reservas: parsed };
}

export function toReservaDTO(r) {
  const esExamen = Object.prototype.hasOwnProperty.call(r, "materia") || Object.prototype.hasOwnProperty.call(r, "mesa");
  return {
    id: r.id,
    aulaId: r.aulaId,
    solicitanteId: r.solicitanteId,
    aprobadoPorId: r.aprobadoPorId ?? null,
    diaSemana: r.diaSemana,
    horaInicio: r.horaInicio,
    horaFin: r.horaFin,
    estado: r.estado,
    observaciones: r.observaciones ?? null,
    creadoEn: r.creadoEn,
    // extras para reservas de examen (opcionales)
    tipo: esExamen ? "EXAMEN" : "REGULAR",
    fecha: r.fecha ?? null,
    materia: r.materia ?? null,
    mesa: r.mesa ?? null,
  };
}

export function parseCreateReservaExamenDTO(body) {
  const errors = [];
  const aulaId = Number(body?.aulaId);
  const fecha = String(body?.fecha ?? ""); // YYYY-MM-DD
  const horaInicio = String(body?.horaInicio ?? "");
  const horaFin = String(body?.horaFin ?? "");
  let materia = body?.materia;
  let mesa = body?.mesa;

  if (!Number.isFinite(aulaId) || aulaId <= 0) errors.push("aulaId inválido");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) errors.push("fecha inválida (YYYY-MM-DD)");
  if (!TIME_REGEX.test(horaInicio)) errors.push("horaInicio inválida (HH:mm o HH:mm:ss)");
  if (!TIME_REGEX.test(horaFin)) errors.push("horaFin inválida (HH:mm o HH:mm:ss)");

  if (materia != null) materia = String(materia).trim();
  if (mesa != null) mesa = String(mesa).trim();
  if (!materia) errors.push("materia es obligatoria");
  if (!mesa) errors.push("mesa es obligatoria");

  if (errors.length) throw httpError(400, errors.join(", "));

  const observaciones = body?.observaciones != null ? String(body.observaciones) : undefined;

  return { aulaId, fecha, horaInicio, horaFin, materia, mesa, observaciones };
}
