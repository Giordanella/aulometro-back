import { generateToken } from "../middlewares/authMiddleware.js";
import * as authService from "../services/authService.js";

// POST /login
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
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
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
