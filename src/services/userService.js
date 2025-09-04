const User = require("../models/user");

async function findAll() {
  return await User.findAll();
}

async function save(userData) {
  return await User.create(userData);
}

module.exports = {
  findAll,
  save,
};
