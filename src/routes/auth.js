import { Router } from "express";
import * as authService from "../services/authService.js";

const router = Router();

// POST /auth/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const user = await authService.loginWithEmailPassword(email, password);
    res.json({ message: "Login successful", user });
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
});

export default router;
