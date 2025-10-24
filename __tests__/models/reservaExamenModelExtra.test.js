import sequelize from "../../src/config/db.js";
import User from "../../src/models/user.js";
import Aula from "../../src/models/aula.js";
import ReservaExamen from "../../src/models/reservaExamen.js";

describe("Modelo ReservaExamen - validación horaFin > horaInicio", () => {
  let user;
  let aula;

  beforeAll(async () => {
    await sequelize.sync({ force: true });
    user = await User.create({ name: "Doc", email: "doc@model.ex", password: "123456", role: "DOCENTE" });
    aula = await Aula.create({ numero: 902, ubicacion: "Y", capacidad: 10 });
  });

  test("lanza si horaFin <= horaInicio", async () => {
    await expect(
      ReservaExamen.create({ solicitanteId: user.id, aulaId: aula.id, fecha: "2026-01-01", diaSemana: 1, horaInicio: "10:00", horaFin: "10:00", estado: "PENDIENTE" })
    ).rejects.toThrow(/horaFin debe ser mayor que horaInicio/);

    await expect(
      ReservaExamen.create({ solicitanteId: user.id, aulaId: aula.id, fecha: "2026-01-02", diaSemana: 2, horaInicio: "11:00", horaFin: "10:59", estado: "PENDIENTE" })
    ).rejects.toThrow(/horaFin debe ser mayor que horaInicio/);
  });

  test("validator de examen usa this.horaFin cuando value es undefined", async () => {
    const rx = await ReservaExamen.create({ solicitanteId: user.id, aulaId: aula.id, fecha: "2026-05-05", diaSemana: 2, horaInicio: "08:00", horaFin: "09:00", estado: "PENDIENTE" });
    const rxid = rx.get({ plain: true }).id;
    const inst = await ReservaExamen.findByPk(rxid);
    const validator = ReservaExamen.rawAttributes.horaFin.validate.esMayorQueInicio;
    // @ts-ignore
    expect(() => validator.call(inst, undefined)).not.toThrow();
    // @ts-ignore
    expect(() => validator.call(inst, "07:59")).toThrow(/horaFin debe ser mayor/);
  });
});
