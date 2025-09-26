import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";
import { USER_ROLES } from "../config/roles.js";

const User = sequelize.define(
  "User",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: { isEmail: true },
    },
    passwordHash: {
      type: DataTypes.STRING,
      allowNull: false,
      field: "password_hash",
    },
    role: {
      type: DataTypes.ENUM(USER_ROLES.DOCENTE, USER_ROLES.DIRECTIVO),
      allowNull: false,
      defaultValue: USER_ROLES.DOCENTE,
    },
  },
  {
    tableName: "users",
    timestamps: false,
  }
);

export default User;
