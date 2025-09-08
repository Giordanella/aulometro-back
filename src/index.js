import express from "express";
import dotenv from "dotenv";
import sequelize from "./config/db.js";
import authRouter from "./routes/auth.js";
import userRoutes from "./routes/users.js";
import cors from "cors";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// CORS
app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  })
);

// Middleware
app.use(express.json());

// Rutas
app.use("/users", userRoutes);
app.use("/login", authRouter);

// Sync DB y levantar servidor
(async () => {
  try {
    await sequelize.authenticate();
    console.log("✅ Conectado a MySQL con Sequelize");

    await sequelize.sync({ alter: true }); //ajusta la tabla users segun el modelo

    app.listen(PORT, () => {
      console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("❌ Error al conectar la base de datos:", err);
  }
})();
