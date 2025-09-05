import { requireRole } from "../middlewares/requireRole.js";
const express = require("express");
const router = express.Router();
const userService = require("../services/userService");

// GET /users
router.get("/", requireRole("DIRECTIVO"), async (req, res) => {
  try {
    const users = await userService.findAll();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /users/:id
router.get("/:id", requireRole("DIRECTIVO"), async (req, res) => {
  try {
    const user = await userService.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /users/:id
router.delete("/:id", requireRole("DIRECTIVO"), async (req, res) => {
  try {
    const deleted = await userService.removeById(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: "User not found" });
    }
    res.status(200).json({ success: "User successfully deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /users
router.delete("/", requireRole("DIRECTIVO"), async (req, res) => {
  try {
    const deletedCount = await userService.removeAll();
    res.status(200).json({ success: `${deletedCount} users deleted` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /users
router.post("/", requireRole("DIRECTIVO"), async (req, res) => {
  try {
    const user = await userService.save(req.body);
    res.status(201).json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /users/:id (actualizar usuario por ID)
router.put("/:id", requireRole("DIRECTIVO"), async (req, res) => {
  try {
    const user = await userService.updateById(req.params.id, req.body);
    res.json(user);
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

// GET /users/docentes (solo directivos)
router.get("/docentes", requireRole("DIRECTIVO"), async (req, res) => {
  try {
    const { page, pageSize } = req.query;
    const data = await svc.listDocentes({
      page: Number(page) || 1,
      pageSize: Number(pageSize) || 20,
    });
    res.json(data);
  } catch (e) {
    res.status(500).json({ message: "Error al listar docentes" });
  }
});

module.exports = router;
