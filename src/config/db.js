import { Sequelize } from "sequelize";
import dotenv from "dotenv";

// Load env vars from .env (dotenv-cli may have already set process.env from .env.test in tests)
dotenv.config();

const DIALECT = process.env.DB_DIALECT || "mysql";

let sequelize;

if (DIALECT === "sqlite") {
  // Use SQLite for tests or lightweight local dev
  sequelize = new Sequelize({
    dialect: "sqlite",
    storage: process.env.DB_STORAGE || ":memory:",
    logging: false,
  });
} else {
  // Default: MySQL
  sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASS,
    {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT ? Number(process.env.DB_PORT) : undefined,
      dialect: "mysql",
      logging: false,
    },
  );
}

export default sequelize;
