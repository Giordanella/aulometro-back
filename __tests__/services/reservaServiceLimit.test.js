import { jest } from "@jest/globals";
import sequelize from "../../src/config/db.js";
import Aula from "../../src/models/aula.js";
import User from "../../src/models/user.js";

describe("ReservaService - límite diario de creación (ramas ocultas en test)", () => {
  const origEnv = process.env;

  beforeAll(async () => {
    await sequelize.sync({ force: true });
  });

  afterEach(() => {
    process.env = origEnv;
    jest.resetModules();
  });

  test.skip("crearReserva respeta MAX_RESERVAS_POR_DIA cuando NODE_ENV!='test'", async () => {
    process.env = { ...origEnv, NODE_ENV: "production", MAX_RESERVAS_POR_DIA: "1" };
    jest.resetModules();
    const svc = await import("../../src/services/reservaService.js");

  const docenteModel = await User.create({ name: "Doc", email: "limit@test.com", password: "123456", role: "DOCENTE" });
  const docente = docenteModel.get({ plain: true });
    const aula = await Aula.create({ numero: 800, ubicacion: "Z", capacidad: 10 });
    const aulaId = aula.get({ plain: true }).id;

    // Primera reserva del día: OK
  const r1 = await svc.crearReserva({ solicitanteId: docente.id, aulaId, diaSemana: 1, horaInicio: "08:00", horaFin: "09:00", observaciones: undefined });
    expect(r1).toBeTruthy();
    // Segunda en el mismo día: debe fallar por límite
    await expect(
      svc.crearReserva({ solicitanteId: docente.id, aulaId, diaSemana: 1, horaInicio: "10:00", horaFin: "11:00", observaciones: undefined })
    ).rejects.toThrow(/Límite diario alcanzado/);
  });
});
