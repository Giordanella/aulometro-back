import sequelize from "../../src/config/db.js";
import Aula from "../../src/models/aula.js";
import User from "../../src/models/user.js";
import Reserva from "../../src/models/reserva.js";
import ReservaExamen from "../../src/models/reservaExamen.js";
import { RESERVA_ESTADO } from "../../src/config/reservas.js";
import {
  crearReserva,
  crearReservaParaExamen,
  listarPendientes,
  listarMias,
  obtenerPorId,
} from "../../src/services/reservaService.js";

describe("Reservas - listados unificados y orden", () => {
  let docente;
  let aula;

  beforeAll(async () => {
    await sequelize.sync({ force: true });
    docente = await User.create({ name: "Doc", email: "doc@t.com", password: "123456", role: "DOCENTE" });
    aula = await Aula.create({ numero: 500, ubicacion: "X", capacidad: 10 });
  });

  test("listarPendientes incluye regulares y exámenes, ordenados por creadoEn asc", async () => {
    const r1 = await crearReserva({ solicitanteId: docente.id, aulaId: aula.id, diaSemana: 2, horaInicio: "08:00", horaFin: "09:00", observaciones: undefined });
    const e1 = await crearReservaParaExamen({ solicitanteId: docente.id, aulaId: aula.id, fecha: "2026-02-02", horaInicio: "09:00", horaFin: "10:00", materia: "A", mesa: "1", observaciones: undefined });

    // Fuerzo orden: r1 más antiguo que e1
    await Reserva.update({ creadoEn: new Date("2025-01-01T08:00:00Z") }, { where: { id: r1.id } });
    await ReservaExamen.update({ creadoEn: new Date("2025-01-01T09:00:00Z") }, { where: { id: e1.id } });

    const pend = await listarPendientes();
    expect(pend.length).toBeGreaterThanOrEqual(2);
    // Los dos primeros deberían respetar el orden que impusimos
    const firstTwo = pend.slice(0, 2);
    const firstIsR1 = firstTwo[0].id === r1.id || firstTwo.find(x => x.id === r1.id) === firstTwo[0];
    expect(firstIsR1).toBe(true);
  });

  test("listarMias mezcla regular y examen y ordena por creadoEn desc", async () => {
    const r2 = await crearReserva({ solicitanteId: docente.id, aulaId: aula.id, diaSemana: 3, horaInicio: "10:00", horaFin: "11:00", observaciones: undefined });
    const e2 = await crearReservaParaExamen({ solicitanteId: docente.id, aulaId: aula.id, fecha: "2026-02-03", horaInicio: "11:00", horaFin: "12:00", materia: "B", mesa: "2", observaciones: undefined });

    // Fuerzo que e2 sea más reciente que r2
    await Reserva.update({ creadoEn: new Date("2025-01-02T10:00:00Z") }, { where: { id: r2.id } });
    await ReservaExamen.update({ creadoEn: new Date("2025-01-03T10:00:00Z") }, { where: { id: e2.id } });

    const mias = await listarMias(docente.id);
    expect(Array.isArray(mias)).toBe(true);
    expect(mias.length).toBeGreaterThanOrEqual(2);
    // El primero debe ser el más reciente (e2)
    expect(mias[0].id).toBe(e2.id);
  });

  test("obtenerPorId devuelve también reservas de examen", async () => {
    const e = await crearReservaParaExamen({ solicitanteId: docente.id, aulaId: aula.id, fecha: "2026-02-05", horaInicio: "08:00", horaFin: "09:00", materia: "C", mesa: "3", observaciones: undefined });
    const r = await obtenerPorId(e.id);
    expect(r).toBeTruthy();
    // estado por defecto PENDIENTE
    expect(r.estado).toBe(RESERVA_ESTADO.PENDIENTE);
    // Tiene campos de examen
    expect(r.materia).toBe("C");
    expect(r.fecha).toBe("2026-02-05");
  });
});
