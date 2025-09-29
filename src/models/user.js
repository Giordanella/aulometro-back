import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";
import bcrypt from "bcrypt";
import { USER_ROLES } from "../config/roles.js";

const SALT_ROUNDS = 10;

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
    // Campo virtual: no se guarda en la DB pero se usa al crear/actualizar
    password: {
      type: DataTypes.VIRTUAL,
      set(value) {
        if (value) {
          this.setDataValue("password", value);
          // Lo copiamos a passwordHash para que el hook lo procese
          this.setDataValue("passwordHash", value);
        }
      },
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

    defaultScope: {
      attributes: { exclude: ["passwordHash"] }, // nunca devolver hash por defecto
    },

    scopes: {
      withPassword: { attributes: undefined }, // incluye todo (para login)
    },
  }
);

// Hook para encriptar automáticamente el password antes de guardar
User.beforeSave(async (user) => {
  if (user.changed("passwordHash")) {
    const hash = await bcrypt.hash(user.passwordHash, SALT_ROUNDS);
    user.passwordHash = hash;
  }
});

export default User;
