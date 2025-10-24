// @ts-nocheck
import sequelize from "../../src/config/db.js";
import Aula from "../../src/models/aula.js";
import User from "../../src/models/user.js";
import {
  crearReserva,
  actualizarReserva,
  crearReservaParaExamen,
  actualizarReservaExamen,
  crearReservaMultiple,
  aprobarReserva,
  aprobarReservaExamen,
  verificarConflictos,
  listarReservasAprobadasDeAula,
  listarReservasExamenAprobadasDeAula,
} from "../../src/services/reservaService.js";

describe("ReservaService - coberturas adicionales útiles", () => {
  let docente;
  let directivo;
  let aulaId;
  let reservaId;

  beforeAll(async () => {
    await sequelize.sync({ force: true });
    docente = await User.create({ name: "Doc", email: "doc+extra@test.com", password: "123456", role: "DOCENTE" });
  directivo = await User.create({ name: "Dir", email: "dir+extra@test.com", password: "123456", role: "DIRECTIVO" });
    const aula = await Aula.create({ numero: 333, ubicacion: "PB", capacidad: 15 });
    aulaId = (aula.get ? aula.get({ plain: true }) : aula).id;

    const r = await crearReserva({ solicitanteId: docente.id, aulaId, diaSemana: 2, horaInicio: "08:00", horaFin: "09:00", observaciones: undefined });
    reservaId = r.id;
  });

  test("actualizarReserva valida duración mínima y máxima", async () => {
    // menor a 30 minutos
    await expect(
      actualizarReserva(reservaId, docente.id, { diaSemana: 2, horaInicio: "10:00", horaFin: "10:20", observaciones: undefined })
    ).rejects.toThrow(/al menos 30 minutos/);

    // mayor a 8 horas
    await expect(
      actualizarReserva(reservaId, docente.id, { diaSemana: 2, horaInicio: "08:00", horaFin: "17:30", observaciones: undefined })
    ).rejects.toThrow(/no puede durar más de 8 horas/);
  });

  test("actualizarReserva detecta duplicada (pendiente del mismo usuario, excluyendo mi id)", async () => {
    // rA pendiente 08-09 y rB pendiente 09-10
    const rA = await crearReserva({ solicitanteId: docente.id, aulaId, diaSemana: 3, horaInicio: "08:00", horaFin: "09:00", observaciones: undefined });
    const rB = await crearReserva({ solicitanteId: docente.id, aulaId, diaSemana: 3, horaInicio: "09:00", horaFin: "10:00", observaciones: undefined });
    // intento mover rB para que quede igual a rA => duplicada (excluye rB por id y detecta rA)
    await expect(
      actualizarReserva(rB.id, docente.id, { diaSemana: 3, horaInicio: "08:00", horaFin: "09:00", observaciones: undefined })
    ).rejects.toThrow(/ya tienes una reserva pendiente/i);
  });

  test("listarReservasAprobadasDeAula/Examen validan parámetros", async () => {
    await expect(listarReservasAprobadasDeAula(undefined)).rejects.toThrow(/requerido/);
    await expect(listarReservasExamenAprobadasDeAula("abc")).rejects.toThrow(/inválido/);
  });

  test("actualizarReservaExamen valida min/max y duplicada (excluirId)", async () => {
    const aula2 = await Aula.create({ numero: 334, ubicacion: "PB", capacidad: 15 });
    const a2Id = aula2.get({ plain: true }).id;
    const e1 = await crearReservaParaExamen({ solicitanteId: docente.id, aulaId: a2Id, fecha: "2026-06-10", horaInicio: "10:00", horaFin: "11:00", materia: "Mat", mesa: "1", observaciones: undefined });
    const e2 = await crearReservaParaExamen({ solicitanteId: docente.id, aulaId: a2Id, fecha: "2026-06-10", horaInicio: "12:00", horaFin: "13:00", materia: "Mat", mesa: "1", observaciones: undefined });

    // min < 30
    await expect(
      actualizarReservaExamen(e1.id, docente.id, { fecha: "2026-06-10", horaInicio: "10:00", horaFin: "10:10", materia: "Mat", mesa: "1", observaciones: undefined })
    ).rejects.toThrow(/al menos 30 minutos/);

    // max > 6h
    await expect(
      actualizarReservaExamen(e1.id, docente.id, { fecha: "2026-06-10", horaInicio: "08:00", horaFin: "15:00", materia: "Mat", mesa: "1", observaciones: undefined })
    ).rejects.toThrow(/no puede durar más de 6 horas/);

    // duplicada: intento mover e2 para coincidir con e1
    await expect(
      actualizarReservaExamen(e2.id, docente.id, { fecha: "2026-06-10", horaInicio: "10:00", horaFin: "11:00", materia: "Mat", mesa: "1", observaciones: undefined })
    ).rejects.toThrow(/ya tienes una reserva de examen pendiente/i);
  });

  test("aprobarReserva falla si no está PENDIENTE (regular y examen)", async () => {
    // Regular
    const r = await crearReserva({ solicitanteId: docente.id, aulaId, diaSemana: 2, horaInicio: "11:00", horaFin: "12:00", observaciones: undefined });
    await aprobarReserva(r.id, directivo.id);
    await expect(aprobarReserva(r.id, directivo.id)).rejects.toThrow(/solo se pueden aprobar/i);

    // Examen
    const e = await crearReservaParaExamen({ solicitanteId: docente.id, aulaId, fecha: "2027-01-15", horaInicio: "10:00", horaFin: "11:00", materia: "Mat", mesa: "1", observaciones: undefined });
    await aprobarReservaExamen(e.id, directivo.id);
    await expect(aprobarReservaExamen(e.id, directivo.id)).rejects.toThrow(/solo se pueden aprobar/i);
  });

  test("crearReservaMultiple detecta conflicto interno entre franjas solapadas", async () => {
    await expect(
      crearReservaMultiple({
        solicitanteId: docente.id,
        aulaId,
        reservas: [
          { diaSemana: 4, horaInicio: "08:00", horaFin: "09:00" },
          { diaSemana: 4, horaInicio: "08:30", horaFin: "09:30" }, // solapa con la anterior
        ],
      })
    ).rejects.toThrow(/conflicto interno/i);
  });

  test("verificarConflictos respeta excluirId (no cuenta mi propia reserva)", async () => {
    // Crear y aprobar una reserva regular
    const r = await crearReserva({ solicitanteId: docente.id, aulaId, diaSemana: 5, horaInicio: "08:00", horaFin: "10:00", observaciones: undefined });
    await aprobarReserva(r.id, directivo.id);

    // Busco conflictos en franja que sólo se solapa con r; al excluir su id, no debe devolver nada
    const conflictos = await verificarConflictos({ aulaId, diaSemana: 5, horaInicio: "08:30", horaFin: "09:00", excluirId: r.id });
    expect(conflictos).toEqual([]);
  });

  test("disponibilidad detecta conflictos y available=false", async () => {
    // Crear y aprobar franja 10:00-12:00
    const r = await crearReserva({ solicitanteId: docente.id, aulaId, diaSemana: 6, horaInicio: "10:00", horaFin: "12:00", observaciones: undefined });
    await aprobarReserva(r.id, directivo.id);
    // Consultar disponibilidad en 11:00-11:30 => debe haber conflictos y available false
    const svc = await import("../../src/services/reservaService.js");
    const disp = await svc.disponibilidad({ aulaId, diaSemana: 6, horaInicio: "11:00", horaFin: "11:30" });
    expect(disp.available).toBe(false);
    expect(disp.conflicts.length).toBeGreaterThanOrEqual(1);
  });

  test("rechazarReservaExamen concatena motivo cuando ya hay observaciones previas", async () => {
    const e = await crearReservaParaExamen({ solicitanteId: docente.id, aulaId, fecha: "2027-02-20", horaInicio: "14:00", horaFin: "15:00", materia: "Mat", mesa: "1", observaciones: "previas" });
    const svc = await import("../../src/services/reservaService.js");
    const rej = await svc.rechazarReservaExamen(e.id, directivo.id, "motivoX");
    expect(rej.estado).toBe("RECHAZADA");
    expect(rej.observaciones).toMatch(/previas \| Motivo rechazo: motivoX/);
  });
});
