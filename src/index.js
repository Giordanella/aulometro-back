const express = require("express");
require("dotenv").config();
const sequelize = require("./config/db");
const userRoutes = require("./routes/users");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Rutas
app.use("/users", userRoutes);

// Sync DB y levantar servidor
(async () => {
  try {
    await sequelize.authenticate();
    console.log("✅ Conectado a MySQL con Sequelize");

    await sequelize.sync(); // crea tablas si no existen (equiv. hibernate.hbm2ddl.auto=update)

    app.listen(PORT, () => {
      console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("❌ Error al conectar la base de datos:", err);
  }
})();
