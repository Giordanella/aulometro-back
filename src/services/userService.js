import User from "../models/user.js";

export async function findById(userId) {
  return await User.findByPk(userId);
}

export async function findAll() {
  return await User.findAll();
}

export async function createUser(userData) {
  const user = await User.create(userData);
  const plain = user.get({ plain: true });
  delete plain.passwordHash;
  return plain;
}

export async function updateById(userId, userData) {
  const user = await User.findByPk(userId);
  if (!user) throw new Error("User not found");

  await user.update(userData);
  const plain = user.get({ plain: true });
  delete plain.passwordHash;
  return plain;
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
