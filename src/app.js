import express from "express";
import dotenv from "dotenv";
import sequelize from "./config/db.js";
import ReservaExamen from "./models/reservaExamen.js";

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

    // Nota: alter para desarrollo, aplicar migraciones en prod
    await sequelize.sync({ alter: true });

    // Backfill: para filas antiguas sin fecha, calcular fecha a partir de creadoEn y diaSemana
    try {
      const pendientes = await ReservaExamen.findAll({ where: { fecha: null } });
      if (pendientes.length > 0) {
        for (const rx of pendientes) {
          const base = rx.creadoEn ? new Date(rx.creadoEn) : new Date();
          base.setHours(0, 0, 0, 0);
          const baseDay = base.getDay(); // 0=Dom..6=Sab
          const target = rx.diaSemana === 7 ? 0 : rx.diaSemana; // 1..6 -> 1..6, 7 -> 0
          let delta = target - baseDay;
          if (delta < 0) delta += 7;
          const d = new Date(base);
          d.setDate(d.getDate() + delta);
          const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
          await rx.update({ fecha: iso });
        }
        console.log(`✅ Backfill de fecha completado para ${pendientes.length} reservas de examen`);
      }
    } catch (e) {
      console.warn("⚠️  No se pudo realizar el backfill de fecha en reservas_examen:", e?.message || e);
    }
    console.log("✅ Sincronización de modelos completada");

    app.listen(PORT, () => {
      console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("❌ Error al conectar la base de datos:", err);
  }
})();
