import { Op } from "sequelize";
import Aula from "../models/aula.js";

export async function findById(aulaId) {
  return await Aula.findByPk(aulaId);
}

export async function findAll({ page = 1, pageSize = 20 } = {}) {
  const offset = (page - 1) * pageSize;
  const { rows, count } = await Aula.findAndCountAll({
    attributes: [
      "id",
      "numero",
      "ubicacion",
      "capacidad",
      "computadoras",
      "tieneProyector",
      "estado",
    ],
    order: [["id", "ASC"]],
    limit: pageSize,
    offset,
  });
  return { rows, count, page, pageSize };
}

export async function createAula(aulaData) {
  if (!aulaData.numero || !aulaData.ubicacion || !aulaData.capacidad) {
    throw new Error("numero, ubicacion y capacidad son obligatorios");
  }
  return await Aula.create({
    numero: aulaData.numero,
    ubicacion: aulaData.ubicacion,
    capacidad: aulaData.capacidad,
    computadoras: aulaData.computadoras ?? 0,
    tieneProyector: aulaData.tieneProyector ?? false,
    estado: aulaData.estado ?? "disponible",
  });
}

export async function updateById(aulaId, aulaData) {
  const aula = await Aula.findByPk(aulaId);
  if (!aula) throw new Error("Aula no encontrada");
  await aula.update(aulaData);
  return aula;
}

export async function removeById(aulaId) {
  return await Aula.destroy({ where: { id: aulaId } });
}

export async function removeAll() {
  const deleted = await Aula.count();
  await Aula.destroy({ where: {}, truncate: true });
  return deleted;
}

export async function buscarAulas(filters = {}) {
  const where = {};

  if (filters.numero) where.numero = Number(filters.numero);
  if (filters.ubicacion) where.ubicacion = { [Op.like]: `%${filters.ubicacion}%` };
  if (filters.capacidadMin) where.capacidad = { [Op.gte]: Number(filters.capacidadMin) };
  if (filters.computadorasMin) where.computadoras = { [Op.gte]: Number(filters.computadorasMin) };
  if (filters.tieneProyector != null)
    where.tieneProyector = filters.tieneProyector === true || filters.tieneProyector === "true";
  if (filters.estado) where.estado = filters.estado;

  const aulas = await Aula.findAll({ where, order: [["numero", "ASC"]] });
  return aulas.map(a => a.get({ plain: true }));
}

export async function getByNumero(numero) {
  if (numero == null) throw new Error("Número de aula requerido");

  const n = Number(numero);
  if (Number.isNaN(n)) throw new Error("Número de aula inválido");

  return await Aula.findOne({
    where: { numero: n },
  });
}
