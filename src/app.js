import express from "express";
import dotenv from "dotenv";
import sequelize from "./config/db.js";

import authRouter from "./routes/auth.js";
import userRouter from "./routes/users.js";
import busquedaRouter from "./routes/busqueda.js";
import aulaRouter from "./routes/aulas.js";
import reservasRouter from "./routes/reservas.js";

import cors from "cors";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  })
);

app.use(express.json());

// Rutas
app.use("/login", authRouter);
app.use("/users", userRouter);
app.use("/busqueda", busquedaRouter);
app.use("/aulas", aulaRouter);
app.use("/reservas", reservasRouter);

(async () => {
  try {
    await sequelize.authenticate();
    console.log("✅ Conectado a MySQL con Sequelize");

    await sequelize.sync();
    console.log("✅ Sincronización de modelos completada");

    app.listen(PORT, () => {
      console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("❌ Error al conectar la base de datos:", err);
  }
})();
