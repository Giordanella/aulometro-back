import { generateToken } from "../middlewares/authMiddleware.js";
import * as authService from "../services/authService.js";
import { toUserDTO } from "../dtos/dtos.js";

// POST /login
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validaciones básicas
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    // Buscar usuario y validar credenciales
    const user = await authService.loginWithEmailPassword(email, password);

    // Generar token
    const token = generateToken(user.id);

    // Responder con DTO
    res.status(200).json({
      token: `Bearer ${token}`,
      user: toUserDTO(user),
    });
  } catch (err) {
    if (err.message === "User not found") {
      return res.status(404).json({ error: err.message });
    }
    if (
      err.message === "Invalid credentials" ||
      err.message === "Invalid password"
    ) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    return res.status(500).json({ error: "Internal server error" });
  }
};
