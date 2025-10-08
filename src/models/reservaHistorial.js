import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const ReservaHistorial = sequelize.define(
  "ReservaHistorial",
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    reservaId: { type: DataTypes.INTEGER, allowNull: false, field: "reserva_id" },
    cambios: { type: DataTypes.TEXT, allowNull: false }, // JSON string
    fechaCambio: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: "fecha_cambio" },
    usuarioId: { type: DataTypes.INTEGER, allowNull: false, field: "usuario_id" },
  },
  {
    tableName: "reserva_historial",
    timestamps: false,
  }
);

export default ReservaHistorial;
