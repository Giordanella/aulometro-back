import jwt from "jsonwebtoken";
import { USER_ROLES } from "../config/roles.js";
import { findById } from "../services/userService.js";

const JWT_SECRET = process.env.JWT_SECRET;

// Crear token
export const generateToken = (userId) =>
  jwt.sign({ userId }, JWT_SECRET, { expiresIn: "24h" });

// Validar token
const validateToken = (token) => jwt.verify(token, JWT_SECRET);

// Middleware de roles
export const checkRole = (role) => {
  return async (req, res, next) => {
    try {
      // Ruta pública
      if (role === USER_ROLES.PUBLIC) return next();

      // Verificar header
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return res.status(401).json({ error: "Authorization header is required" });
      }

      // Extraer token (Bearer <token>)
      const token = authHeader.split(" ")[1];
      if (!token) {
        return res.status(401).json({ error: "Token is missing" });
      }

      // Validar token y buscar usuario
      const decoded = validateToken(token);
      const user = await findById(decoded.userId);

      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }

      // Validar rol del usuario
      if (role !== user.role) {
        return res.status(403).json({ error: "Forbidden: insufficient permissions" });
      }

      req.user = user;
      next();

    } catch (error) {
      console.error(error);
      res.status(401).json({ error: "Invalid token" });
    }
  };
};
