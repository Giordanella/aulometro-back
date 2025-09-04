const express = require("express");
const router = express.Router();
const userService = require("../services/userService");

// GET /users
router.get("/", async (req, res) => {
  try {
    const users = await userService.findAll();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /users
router.post("/", async (req, res) => {
  try {
    const user = await userService.save(req.body);
    res.status(201).json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
