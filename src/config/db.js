import { Sequelize } from "sequelize";
import dotenv from "dotenv";

// Load env vars from .env (dotenv-cli may have already set process.env from .env.test in tests)
dotenv.config();

export function createSequelizeFromEnv(env) {
  const DIALECT = env.DB_DIALECT || "mysql";
  if (DIALECT === "sqlite") {
    return new Sequelize({
      dialect: "sqlite",
      storage: env.DB_STORAGE || ":memory:",
      logging: false,
    });
  }
  return new Sequelize(
    env.DB_NAME,
    env.DB_USER,
    env.DB_PASS,
    {
      host: env.DB_HOST,
      port: env.DB_PORT ? Number(env.DB_PORT) : undefined,
      dialect: "mysql",
      logging: false,
    },
  );
}

const sequelize = createSequelizeFromEnv(process.env);
export default sequelize;
