import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const Aula = sequelize.define(
  "Aula",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    numero: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
      validate: {
        min: {
          args: [1],
          msg: "El número de aula debe ser mayor que 0",
        },
      },
    },
    ubicacion: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: {
          msg: "La ubicación no puede estar vacía",
        },
      },
    },
    capacidad: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: {
          args: [1],
          msg: "La capacidad debe ser al menos 1",
        },
      },
    },
    computadoras: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: {
          args: [0],
          msg: "La cantidad de computadoras no puede ser negativa",
        },
        isMenorQueCapacidad(value) {
          if (value > this.capacidad) {
            throw new Error("Las computadoras no pueden ser más que la capacidad del aula");
          }
        },
      },
    },
    tieneProyector: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: "tiene_proyector",
    },
    estado: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "disponible",
      validate: {
        isIn: {
          args: [["disponible", "ocupada", "mantenimiento"]],
          msg: "El estado debe ser disponible, ocupada o mantenimiento",
        },
      },
    },
  },
  {
    tableName: "aulas",
    timestamps: false,
  }
);

export default Aula;
