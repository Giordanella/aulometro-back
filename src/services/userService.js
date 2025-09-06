import User from "../models/user.js";

export async function findAll() {
  return await User.findAll();
}

export async function save(userData) {
  return await User.create(userData);
}

export async function findById(userId) {
  return await User.findByPk(userId);
}

export async function removeById(userId) {
  return await User.destroy({ where: { id: userId } });
}

export async function removeAll() {
  const deleted = await User.count();
  await User.destroy({
    where: {},
    truncate: true,
  });
  return deleted;
}

export async function updateById(userId, userData) {
  try {
    const user = await User.findByPk(userId);
    await user.update(userData);
    return user;
  } catch (error) {
    throw new Error("User not found");
  }
}

// Crear docente (en rutas se valida el rol)
export async function createDocente({ nombre, email }) {
  return User.create({ nombre, email, role: "DOCENTE" });
}

export async function listDocentes({ page = 1, pageSize = 20 } = {}) {
  const offset = (page - 1) * pageSize;
  const { rows, count } = await User.findAndCountAll({
    where: { role: "DOCENTE" },
    attributes: ["id", "nombre", "email", "role"],
    order: [["id", "ASC"]],
    limit: pageSize,
    offset,
  });
  return { rows, count, page, pageSize };
}
