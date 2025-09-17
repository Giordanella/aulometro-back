import User from "../models/user.js";
import bcrypt from "bcrypt";

const SALT_ROUNDS = 10; // parametro para hashear password en createUser


export async function findById(userId) {
  return await User.findByPk(userId);
}

export async function findAll() {
  return await User.findAll();
}

export async function createUser(userData) {
  const { password, ...rest } = userData; // separo la password del resto
  if (!password) throw new Error("password requiered");
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await User.create({
    ...rest,
    passwordHash, // se guarda el hash, no la contraseña cruda
  });
  // para no exponer el hash al devolver el user
  const plain = user.get({ plain: true });
  delete plain.passwordHash;

  return plain;
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

export async function listDocentes({ page = 1, pageSize = 20 } = {}) {
  const offset = (page - 1) * pageSize;
  const { rows, count } = await User.findAndCountAll({
    where: { role: "DOCENTE" },
    attributes: ["id", "name", "email", "role"],
    order: [["id", "ASC"]],
    limit: pageSize,
    offset,
  });
  return { rows, count, page, pageSize };
}
