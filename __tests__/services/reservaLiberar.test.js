import sequelize from "../../src/config/db.js";
import Aula from "../../src/models/aula.js";
import User from "../../src/models/user.js";
import { RESERVA_ESTADO } from "../../src/config/reservas.js";
import {
  crearReserva,
  aprobarReserva,
  liberarReserva,
  crearReservaParaExamen,
  aprobarReservaExamen,
  liberarReservaExamen,
} from "../../src/services/reservaService.js";

describe("Reservas - liberar (descartar aprobadas)", () => {
  let docente;
  let directivo;
  let aula;

  beforeAll(async () => {
    await sequelize.sync({ force: true });
    docente = await User.create({ name: "Doc", email: "doc@t.com", password: "123456", role: "DOCENTE" });
    directivo = await User.create({ name: "Dir", email: "dir@t.com", password: "123456", role: "DIRECTIVO" });
    aula = await Aula.create({ numero: 999, ubicacion: "Piso 1", capacidad: 20 });
  });

  test("liberarReserva: pasa de APROBADA a CANCELADA y valida estados e inexistentes", async () => {
    const r = await crearReserva({ solicitanteId: docente.id, aulaId: aula.id, diaSemana: 1, horaInicio: "08:00", horaFin: "09:00", observaciones: undefined });
    const ap = await aprobarReserva(r.id, directivo.id);
    expect(ap.estado).toBe(RESERVA_ESTADO.APROBADA);

    const lib = await liberarReserva(r.id);
    expect(lib.estado).toBe(RESERVA_ESTADO.CANCELADA);

    await expect(liberarReserva(r.id)).rejects.toThrow(/Solo se pueden liberar reservas aprobadas/);
    await expect(liberarReserva(99999999)).rejects.toThrow(/no encontrada/i);
  });

  test("liberarReservaExamen: pasa de APROBADA a CANCELADA y valida estados e inexistentes", async () => {
    const rx = await crearReservaParaExamen({ solicitanteId: docente.id, aulaId: aula.id, fecha: "2026-10-10", horaInicio: "10:00", horaFin: "11:00", materia: "X", mesa: "M", observaciones: undefined });
    const apx = await aprobarReservaExamen(rx.id, directivo.id);
    expect(apx.estado).toBe(RESERVA_ESTADO.APROBADA);

    const libx = await liberarReservaExamen(rx.id);
    expect(libx.estado).toBe(RESERVA_ESTADO.CANCELADA);

    await expect(liberarReservaExamen(rx.id)).rejects.toThrow(/Solo se pueden liberar reservas aprobadas/);
    await expect(liberarReservaExamen(99999999)).rejects.toThrow(/no encontrada/i);
  });
});
