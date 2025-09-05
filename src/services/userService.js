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

module.exports = {
  findAll,
  save,
  findById,
  removeById,
  removeAll,
};
