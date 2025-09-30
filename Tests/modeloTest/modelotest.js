import Aula from "../../src/models/aula.js";
import sequelize from "../../src/config/db.js";

describe("Modelo Aula - smoke tests", () => {
	beforeAll(async () => {
		await sequelize.sync();
	});

	afterAll(async () => {
		await sequelize.close();
	});

	test("definición del modelo", () => {
		expect(Aula).toBeDefined();
		expect(Aula.getTableName()).toBe("aulas");
	});
});
