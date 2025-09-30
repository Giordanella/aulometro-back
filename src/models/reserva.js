import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";
import Aula from "./aula.js";
import User from "./user.js";
import { RESERVA_ESTADO, normalizarHora } from "../config/reservas.js";

const Reserva = sequelize.define(
  "Reserva",
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    aulaId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "aula_id",
      references: { model: "aulas", key: "id" },
    },
    solicitanteId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "solicitante_id",
      references: { model: "users", key: "id" },
    },
    aprobadoPorId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "aprobado_por_id",
      references: { model: "users", key: "id" },
    },
    diaSemana: {
      type: DataTypes.INTEGER, // 1 (lunes) - 7 (domingo)
      allowNull: false,
      field: "dia_semana",
      validate: {
        isInt: true,
        min: 1,
        max: 7,
      },
    },
    horaInicio: {
      type: DataTypes.TIME,
      allowNull: false,
      field: "hora_inicio",
      set(val) {
        this.setDataValue("horaInicio", normalizarHora(val));
      },
    },
    horaFin: {
      type: DataTypes.TIME,
      allowNull: false,
      field: "hora_fin",
      set(val) {
        this.setDataValue("horaFin", normalizarHora(val));
      },
      validate: {
        esMayorQueInicio(value) {
          const inicio = this.horaInicio;
          const fin = value ?? this.horaFin;
          if (inicio && fin && String(fin) <= String(inicio)) {
            throw new Error("horaFin debe ser mayor que horaInicio");
          }
        },
      },
    },
    estado: {
      type: DataTypes.ENUM(
        RESERVA_ESTADO.PENDIENTE,
        RESERVA_ESTADO.APROBADA,
        RESERVA_ESTADO.RECHAZADA,
        RESERVA_ESTADO.CANCELADA
      ),
      allowNull: false,
      defaultValue: RESERVA_ESTADO.PENDIENTE,
    },
    observaciones: { type: DataTypes.TEXT, allowNull: true },
    creadoEn: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: "creado_en" },
  },
  {
    tableName: "reservas",
    timestamps: false,
    indexes: [
      { unique: false, fields: ["aula_id", "dia_semana", "hora_inicio", "hora_fin", "estado"] },
    ],
  }
);

Reserva.belongsTo(Aula, { foreignKey: "aulaId", as: "aula" });
Reserva.belongsTo(User, { foreignKey: "solicitanteId", as: "solicitante" });
Reserva.belongsTo(User, { foreignKey: "aprobadoPorId", as: "aprobadoPor" });

export default Reserva;
