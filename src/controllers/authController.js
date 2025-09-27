import { generateToken } from "../middlewares/authMiddleware.js";
import * as authService from "../services/authService.js";

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const user = await authService.loginWithEmailPassword(email, password);

    const token = generateToken(user.id);

    res.status(200).json({
      token: `Bearer ${token}`,
      user, // ya es un DTO
    });
  } catch (err) {
    if (err.message === "Invalid credentials") {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    return res.status(500).json({ error: "Internal server error" });
  }
};
