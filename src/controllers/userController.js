import * as userService from "../services/userService.js";
import { toUserDTO } from "../dtos/dtos.js";

export const createUser = async (req, res) => {
  try {
    const user = await userService.createUser(req.body);
    res.status(201).json(toUserDTO(user));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getUser = async (req, res) => {
  try {
    const user = await userService.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json(toUserDTO(user));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getAllUsers = async (req, res) => {
  try {
    const users = await userService.findAll();
    res.json(users.map(toUserDTO));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const updateUser = async (req, res) => {
  try {
    const user = await userService.updateById(req.params.id, req.body);
    res.json(toUserDTO(user));
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const deleted = await userService.removeById(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: "User not found" });
    }
    res.status(200).json({ success: "User successfully deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const deleteAllUsers = async (req, res) => {
  try {
    const deletedCount = await userService.removeAll();
    res.status(200).json({ success: `${deletedCount} users deleted` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getDocentes = async (req, res) => {
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
};
