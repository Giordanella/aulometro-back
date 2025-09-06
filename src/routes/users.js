import express from "express";
import { requireRole } from "../middlewares/requireRole.js";
import * as userService from "../services/userService.js";

const router = express.Router();

/**
 * Es importante que la ruta GET /users/docentes esté definida antes que la ruta GET /users/:id,
 * ya que Express evalúa las rutas en el orden en que se definen. Si /docentes se colocara después
 * de /:id, una solicitud a /users/docentes coincidiría erróneamente con el patrón dinámico /:id,
 * interpretando "docentes" como un ID de usuario. Esto puede provocar errores o respuestas
 * incorrectas. Por lo tanto, siempre se deben definir primero las rutas más específicas para evitar
 * conflictos con rutas más generales o dinámicas.
 */

// GET /users/docentes
router.get("/docentes", requireRole("DIRECTIVO"), async (req, res) => {
  try {
    const { page, pageSize } = req.query;
    const data = await userService.listDocentes({
      page: Number(page) || 1,
      pageSize: Number(pageSize) || 20,
    });
    res.json(data);
  } catch (e) {
    res.status(500).json({ message: "Error al listar docentes" });
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

// GET /users
router.get("/", requireRole("DIRECTIVO"), async (req, res) => {
  try {
    const users = await userService.findAll();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /users
router.post("/", requireRole("DIRECTIVO"), async (req, res) => {
  try {
    const user = await userService.createUser(req.body);
    res.status(201).json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /users/:id
router.put("/:id", requireRole("DIRECTIVO"), async (req, res) => {
  try {
    const user = await userService.updateById(req.params.id, req.body);
    res.json(user);
  } catch (err) {
    res.status(404).json({ error: err.message });
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

export default router;
