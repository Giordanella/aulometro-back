const User = require("../models/user");

async function findAll() {
  return await User.findAll();
}

async function save(userData) {
  return await User.create(userData);
}

async function findById(userId) {
  return await User.findByPk(userId);
}

async function removeById(userId) {
  return await User.destroy({ where: { id: userId } });
}

async function removeAll() {
  const deleted = await User.count();
  await User.destroy({
    where: {},
    truncate: true,
  });
  return deleted;
}

async function updateById(userId, userData) {
  try {
    const user = await User.findByPk(userId);
    await user.update(userData);
    return user;
  } catch (error) {
    throw new Error("User not found");
  }
}

//crear docente -> en routes se valida que el que llama a esta funcion sea directivo
async function createDocente({ nombre, email }) {
  return User.create({ nombre, email, role: "DOCENTE" });
}

async function listDocentes({ page = 1, pageSize = 20 } = {}) {
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

module.exports = {
  findAll,
  save,
  findById,
  removeById,
  removeAll,
  updateById,
  createDocente,
  listDocentes,
};
