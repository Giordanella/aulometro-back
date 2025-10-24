import sequelize from "../../src/config/db.js";
import User from "../../src/models/user.js";
import Aula from "../../src/models/aula.js";
import Reserva from "../../src/models/reserva.js";

describe("Modelo Reserva - validación horaFin > horaInicio", () => {
  let user;
  let aula;

  beforeAll(async () => {
    await sequelize.sync({ force: true });
    user = await User.create({ name: "Doc", email: "doc@model.test", password: "123456", role: "DOCENTE" });
    aula = await Aula.create({ numero: 901, ubicacion: "X", capacidad: 10 });
  });

  test("lanza si horaFin == horaInicio", async () => {
    await expect(
      Reserva.create({ solicitanteId: user.id, aulaId: aula.id, diaSemana: 1, horaInicio: "10:00", horaFin: "10:00", estado: "PENDIENTE" })
    ).rejects.toThrow(/horaFin debe ser mayor que horaInicio/);
  });

  test("lanza si horaFin < horaInicio", async () => {
    await expect(
      Reserva.create({ solicitanteId: user.id, aulaId: aula.id, diaSemana: 2, horaInicio: "11:00", horaFin: "10:59", estado: "PENDIENTE" })
    ).rejects.toThrow(/horaFin debe ser mayor que horaInicio/);
  });

  test("validator usa this.horaFin cuando value es undefined (branch alterno)", async () => {
    const rModel = await Reserva.create({ solicitanteId: user.id, aulaId: aula.id, diaSemana: 3, horaInicio: "08:00", horaFin: "09:00", estado: "PENDIENTE" });
    const rid = rModel.get({ plain: true }).id;
    const instance = await Reserva.findByPk(rid);
    // Tomamos el validador y lo llamamos con el contexto de la instancia
    const validator = Reserva.rawAttributes.horaFin.validate.esMayorQueInicio;
    // @ts-ignore
    expect(() => validator.call(instance, undefined)).not.toThrow();
    // @ts-ignore
    expect(() => validator.call(instance, "07:59")).toThrow(/horaFin debe ser mayor/);
  });
});
