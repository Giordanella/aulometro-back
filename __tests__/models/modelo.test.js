import Aula from "../../src/models/aula.js";
import sequelize from "../../src/config/db.js";

describe("Modelo Aula - smoke tests", () => {
  beforeAll(async () => {
    await sequelize.sync();
  });

  // No cerramos aquí; otros suites también usan la misma conexión.

  test("definición del modelo", () => {
    expect(Aula).toBeDefined();
    expect(Aula.getTableName()).toBe("aulas");
  });
});
