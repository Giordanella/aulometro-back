import express from "express";
import dotenv from "dotenv";
import sequelize from "./config/db.js";
import authRouter from "./routes/auth.js";
import userRoutes from "./routes/users.js";
import cors from "cors";
import busquedaRoutes from "./routes/busqueda.js";
import Aula from "./models/aula.js";
import aulaRoutes from "./routes/aulas.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// CORS
app.use(
  cors({
    origin: process.env.FRONTEND_URL, // ej: http://localhost:5173
    credentials: true,
  })
);

// Middleware
app.use(express.json());

// Rutas
app.use("/users", userRoutes);
app.use("/login", authRouter);
app.use("/aulas", aulaRoutes);
app.use("/busqueda", busquedaRoutes);

// Sync DB y levantar servidor
(async () => {
  try {
    await sequelize.authenticate();
    console.log("✅ Conectado a MySQL con Sequelize");

    await sequelize.sync({ alter: true }); // crea/ajusta tablas (users, aulas, etc.)

    app.listen(PORT, () => {
      console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("❌ Error al conectar la base de datos:", err);
  }
})();
