import bcrypt from "bcrypt";
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

export async function changePassword(userId, currentPassword, newPassword) {
  const user = await User.scope("withPassword").findByPk(userId);
  if (!user) throw new Error("User not found");

  const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!isMatch) throw new Error("Invalid current password");

  const isSamePassword = await bcrypt.compare(newPassword, user.passwordHash);
  if (isSamePassword) throw new Error("New password must be different");

  user.password = newPassword;
  await user.save();

  const plain = user.get({ plain: true });
  delete plain.passwordHash;
  return plain;
}
