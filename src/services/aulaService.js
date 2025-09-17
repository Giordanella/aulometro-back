// src/services/aulaService.js
// @ts-check
import { Op } from "sequelize";
import Aula from "../models/aula.js";

/**
 * @typedef {"disponible" | "ocupada" | "mantenimiento"} AulaEstado
 */

/**
 * @typedef {Object} AulaPayload
 * @property {number|string} numero
 * @property {string} ubicacion
 * @property {number|string} capacidad
 * @property {number|string=} computadoras
 * @property {boolean|string=} tieneProyector
 * @property {AulaEstado=} estado
 */

/**
 * @typedef {Object} ListParams
 * @property {string=} q
 * @property {boolean|string=} conProyector
 * @property {number|string=} minCapacidad
 * @property {number|string=} page
 * @property {number|string=} pageSize
 */

/** Pequeña utilidad de error con status HTTP */
export class HttpError extends Error {
  /**
   * @param {number} status
   * @param {string} message
   */
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

/**
 * Normaliza tipos básicos (por si vienen como string desde el front)
 * @param {Partial<AulaPayload>=} payload
 */
function normalizePayload(payload = {}) {
  const data = { ...payload };

  if (data.numero !== undefined) data.numero = Number(data.numero);
  if (data.capacidad !== undefined) data.capacidad = Number(data.capacidad);
  if (data.computadoras !== undefined) data.computadoras = Number(data.computadoras);
  if (data.tieneProyector !== undefined)
    data.tieneProyector = data.tieneProyector === true || data.tieneProyector === "true";

  if (!data.estado) data.estado = "disponible";

  return /** @type {Required<Pick<AulaPayload,"estado">> & Partial<AulaPayload>} */ (data);
}

export async function buscarPorNumero (payload){
  //proposito:devuelve un aula con el numero ingresado
  const numero = Number(payload.numero);
  if (isNaN(numero)) {
    throw new HttpError(400, "El número de aula es inválido");
  }
  const aula = await Aula.findOne({ where: { numero } });
  if (!aula) {
    throw new HttpError(404, `No se encontró un aula con el número ${numero}`);
  }
  return aula;
}

/**
 * Crea un aula (valida campos mínimos y unicidad de `numero`)
 * @param {AulaPayload} payload
 */
export async function createAula(payload) {
  const data = normalizePayload(payload);

  if (data.numero == null || !data.ubicacion || data.capacidad == null) {
    throw new HttpError(400, "numero, ubicacion y capacidad son obligatorios");
  }


  const exists = await Aula.findOne({ where: { numero: data.numero } });
  if (exists) throw new HttpError(409, `Ya existe un aula con el número ${data.numero}`);

  const aula = await Aula.create({
    numero: /** @type {number} */ (data.numero),
    ubicacion: data.ubicacion,
    capacidad: /** @type {number} */ (data.capacidad),
    computadoras: data.computadoras ?? 0,
    tieneProyector: data.tieneProyector ?? false,
    estado: data.estado,
  });

  return aula;
}

/**
 * Lista aulas con filtros y paginación
 */
export async function listAulas({ page = 1, pageSize = 20 } = {}) {
  const offset = (page - 1) * pageSize;
  const { rows, count } = await Aula.findAndCountAll({
    attributes: ["id", "numero", "ubicacion", "capacidad", "computadoras", "tieneProyector", "estado"],
    order: [["id", "ASC"]],
    limit: pageSize,
    offset,
  });
  return { rows, count, page, pageSize };
}

/**
 * Obtiene un aula por ID
 * @param {number|string} id
 */
export async function getAulaById(id) {
  const aula = await Aula.findByPk(id);
  if (!aula) throw new HttpError(404, "Aula no encontrada");
  return aula;
}

/**
 * Actualiza un aula (valida unicidad de numero si se cambia)
 * @param {number|string} id
 * @param {Partial<AulaPayload>} payload
 */
export async function updateAula(id, payload) {
  const aula = await Aula.findByPk(id);
  if (!aula) throw new HttpError(404, "Aula no encontrada");

  const data = normalizePayload(payload);

  // ⚠️ Usar get() para leer valores actuales sin que TS se queje
  /** @type {any} */
  const current = aula.get();

  // Si cambia el número, validar unicidad
  if (data.numero !== undefined && data.numero !== current.numero) {
    const exists = await Aula.findOne({ where: { numero: data.numero } });
    if (exists) throw new HttpError(409, `Ya existe un aula con el número ${data.numero}`);
  }

  await aula.update({
    numero: data.numero ?? current.numero,
    ubicacion: data.ubicacion ?? current.ubicacion,
    capacidad: data.capacidad ?? current.capacidad,
    computadoras: data.computadoras ?? current.computadoras,
    tieneProyector:
      data.tieneProyector !== undefined ? data.tieneProyector : current.tieneProyector,
    estado: data.estado ?? current.estado,
  });

  return aula;
}

/**
 * Elimina un aula
 * @param {number|string} id
 */
export async function deleteAula(id) {
  const aula = await Aula.findByPk(id);
  if (!aula) throw new HttpError(404, "Aula no encontrada");
  await aula.destroy();
  return { ok: true };
}

export default {
  createAula,
  listAulas,
  getAulaById,
  updateAula,
  deleteAula,
  buscarPorNumero,
  HttpError,
};
