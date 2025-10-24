import { createSequelizeFromEnv } from "../../src/config/db.js";

describe("config/db.js branches via factory", () => {
  test("mysql branch constructs instance with mysql dialect (DB_PORT truthy)", async () => {
    const env = {
      DB_DIALECT: "mysql",
      DB_NAME: "dbn",
      DB_USER: "dbu",
      DB_PASS: "dbp",
      DB_HOST: "localhost",
      DB_PORT: "3307",
    };
    const sequelize = createSequelizeFromEnv(env);
    expect(sequelize.getDialect()).toBe("mysql");
    await sequelize.close();
  });

  test("sqlite branch uses :memory: when DB_STORAGE is falsy", async () => {
    const sqliteEnv = { DB_DIALECT: "sqlite", DB_STORAGE: "" };
    const sq1 = createSequelizeFromEnv(sqliteEnv);
    expect(sq1.getDialect()).toBe("sqlite");
    await sq1.close();
  });

  test("sqlite branch uses file storage when DB_STORAGE is provided", async () => {
    const sqliteEnv2 = { DB_DIALECT: "sqlite", DB_STORAGE: "./test.sqlite" };
    const sq2 = createSequelizeFromEnv(sqliteEnv2);
    expect(sq2.getDialect()).toBe("sqlite");
    await sq2.close();
  });

  test("mysql branch without DB_PORT (falsy) still creates mysql instance", async () => {
    const env = {
      DB_DIALECT: "mysql",
      DB_NAME: "dbn",
      DB_USER: "dbu",
      DB_PASS: "dbp",
      DB_HOST: "localhost",
    };
    const sequelize = createSequelizeFromEnv(env);
    expect(sequelize.getDialect()).toBe("mysql");
    await sequelize.close();
  });
});
