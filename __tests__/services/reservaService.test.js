/**
 * Tests de crearReserva y validaciones de bordes, más flujos adicionales.
// @ts-nocheck
 */
import dotenv from "dotenv";
dotenv.config();

import sequelize from "../../src/config/db.js";
import Aula from "../../src/models/aula.js";
import User from "../../src/models/user.js";
import Reserva from "../../src/models/reserva.js";
import ReservaExamen from "../../src/models/reservaExamen.js";
import {
  crearReserva,
  aprobarReserva,
  crearReservaMultiple,
  disponibilidad,
  rechazarReserva,
  cancelarReserva,
  actualizarReserva,
  listarPendientes,
  listarMias,
  obtenerPorId,
  crearReservaParaExamen,
  verificarConflictosExamen,
  actualizarReservaExamen,
  aprobarReservaExamen,
  rechazarReservaExamen,
  cancelarReservaExamen,
  listarReservasAprobadasDeAula,
  listarReservasExamenAprobadasDeAula,
  verificarConflictos,
} from "../../src/services/reservaService.js";
import { RESERVA_ESTADO } from "../../src/config/reservas.js";

describe("ReservaService - casos variados", () => {
  let docente;
  let directivo;
  let aula;

  beforeAll(async () => {
    await sequelize.sync({ force: true });
    docente = await User.create({ name: "Doc", email: "doc@test.com", password: "123456", role: "DOCENTE" });
    directivo = await User.create({ name: "Dir", email: "dir@test.com", password: "123456", role: "DIRECTIVO" });
    aula = await Aula.create({ numero: 112, ubicacion: "P1", capacidad: 30, computadoras: 10, tieneProyector: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  test("validaciones básicas y errores varios", async () => {
    await expect(
      crearReserva({ solicitanteId: docente.id, aulaId: aula.id, diaSemana: 1, horaInicio: null, horaFin: null, observaciones: undefined })
    ).rejects.toThrow(/obligatorios/);

    await expect(
      crearReserva({ solicitanteId: null, aulaId: aula.id, diaSemana: 1, horaInicio: "10:00", horaFin: "12:00", observaciones: undefined })
    ).rejects.toThrow(/obligatorios/);

    await expect(
      crearReserva({ solicitanteId: docente.id, aulaId: 999999, diaSemana: 2, horaInicio: "10:00", horaFin: "12:00", observaciones: undefined })
    ).rejects.toThrow(/Aula no encontrada/);
  });

  test("validación modelo: horaFin <= horaInicio", async () => {
    await expect(
      crearReserva({ solicitanteId: docente.id, aulaId: aula.id, diaSemana: 3, horaInicio: "12:00", horaFin: "12:00", observaciones: undefined })
    ).rejects.toThrow(/horaFin debe ser mayor que horaInicio/);

    await expect(
      crearReserva({ solicitanteId: docente.id, aulaId: aula.id, diaSemana: 3, horaInicio: "13:00", horaFin: "12:59", observaciones: undefined })
    ).rejects.toThrow(/horaFin debe ser mayor que horaInicio/);
  });

  test("crear y normalizar, disponibilidad y aprobar/rechazar/cancelar/editar", async () => {
    const r = await crearReserva({ solicitanteId: docente.id, aulaId: aula.id, diaSemana: 4, horaInicio: "12:30", horaFin: "14:30", observaciones: undefined });
    expect(r.horaInicio).toBe("12:30:00");
    expect(r.horaFin).toBe("14:30:00");
    expect(r.estado).toBe(RESERVA_ESTADO.PENDIENTE);

    const disp = await disponibilidad({ aulaId: aula.id, diaSemana: 4, horaInicio: "12:30", horaFin: "14:30" });
    expect(disp.available).toBe(true);

  const rPend = await crearReserva({ solicitanteId: docente.id, aulaId: aula.id, diaSemana: 4, horaInicio: "16:00", horaFin: "18:00", observaciones: undefined });
    const rAprob = await aprobarReserva(rPend.id, directivo.id);
    expect(rAprob.estado).toBe(RESERVA_ESTADO.APROBADA);

    await expect(
  crearReserva({ solicitanteId: docente.id, aulaId: aula.id, diaSemana: 4, horaInicio: "17:00", horaFin: "19:00", observaciones: undefined })
    ).rejects.toThrow(/Conflicto/);

  const rOk = await crearReserva({ solicitanteId: docente.id, aulaId: aula.id, diaSemana: 4, horaInicio: "18:00", horaFin: "19:00", observaciones: undefined });
    expect(rOk.estado).toBe(RESERVA_ESTADO.PENDIENTE);

    // rechazar y cancelar
    const rToReject = await crearReserva({ solicitanteId: docente.id, aulaId: aula.id, diaSemana: 5, horaInicio: "10:00", horaFin: "11:00", observaciones: "obs" });
    const rechazo = await rechazarReserva(rToReject.id, directivo.id, "Motivo X");
    expect(rechazo.estado).toBe(RESERVA_ESTADO.RECHAZADA);
    expect(rechazo.observaciones).toMatch(/Motivo rechazo/);

  const rToCancel = await crearReserva({ solicitanteId: docente.id, aulaId: aula.id, diaSemana: 5, horaInicio: "12:00", horaFin: "13:00", observaciones: undefined });
    const cancelada = await cancelarReserva(rToCancel.id, docente.id);
    expect(cancelada.estado).toBe(RESERVA_ESTADO.CANCELADA);

    // actualizar (editar) con revalidación de conflictos
  const rToEdit = await crearReserva({ solicitanteId: docente.id, aulaId: aula.id, diaSemana: 5, horaInicio: "14:00", horaFin: "15:00", observaciones: undefined });
    await aprobarReserva(rToEdit.id, directivo.id);
    // Ahora intento editar otra reserva y chocar
  const rToEdit2 = await crearReserva({ solicitanteId: docente.id, aulaId: aula.id, diaSemana: 5, horaInicio: "16:00", horaFin: "17:00", observaciones: undefined });
  await expect(actualizarReserva(rToEdit2.id, docente.id, { diaSemana: 5, horaInicio: "14:30", horaFin: "15:30", observaciones: undefined })).rejects.toThrow(/Conflicto/);
  });

  test("listar pendientes/mias y obtenerPorId", async () => {
    const mias = await listarMias(docente.id);
    expect(Array.isArray(mias)).toBe(true);
    expect(mias.length).toBeGreaterThan(0);

    const pend = await listarPendientes();
    expect(Array.isArray(pend)).toBe(true);

    const uno = await obtenerPorId(mias[0].id);
    expect(uno).toBeTruthy();
  });

  test("examen: crear, verificar conflictos, aprobar y listar por aula", async () => {
    const aula2 = await Aula.create({ numero: 210, ubicacion: "P2", capacidad: 40, computadoras: 20, tieneProyector: false });
  const rex = await crearReservaParaExamen({ solicitanteId: docente.id, aulaId: aula2.id, fecha: "2025-11-30", horaInicio: "10:00", horaFin: "12:00", materia: "Algebra", mesa: "A", observaciones: undefined });
    expect(rex.estado).toBe(RESERVA_ESTADO.PENDIENTE);

    const rxAprobada = await aprobarReservaExamen(rex.id, directivo.id);
    expect(rxAprobada.estado).toBe(RESERVA_ESTADO.APROBADA);

    const confs = await verificarConflictosExamen({ aulaId: aula2.id, fecha: "2025-11-30", horaInicio: "11:00", horaFin: "12:30" });
    expect(confs.length).toBeGreaterThanOrEqual(1);

    const listAula = await listarReservasExamenAprobadasDeAula(aula2.id);
    expect(Array.isArray(listAula)).toBe(true);

    const listReg = await listarReservasAprobadasDeAula(aula.id);
    expect(Array.isArray(listReg)).toBe(true);
  });

  test("batch atómico: rollback ante solapamiento interno", async () => {
    const aulaBatch2 = await Aula.create({ numero: 211, ubicacion: "P2", capacidad: 35, computadoras: 15, tieneProyector: true });
    const aulaBatch2Id = (aulaBatch2.get ? aulaBatch2.get({ plain: true }) : aulaBatch2).id;

    await expect(
      crearReservaMultiple({
        solicitanteId: docente.id,
        aulaId: aulaBatch2Id,
        reservas: [
          { diaSemana: 1, horaInicio: "10:00", horaFin: "12:00", observaciones: "Solapa A" },
          { diaSemana: 1, horaInicio: "11:00", horaFin: "13:00", observaciones: "Solapa B" },
        ],
      })
    ).rejects.toThrow(/Conflicto interno en batch/);

    const creadas = await Reserva.findAll({ where: { aulaId: aulaBatch2Id } });
    expect(creadas).toHaveLength(0);
  });

  test("flujos de reserva examen: actualizar, rechazar y cancelar", async () => {
    const aula3 = await Aula.create({ numero: 212, ubicacion: "P3", capacidad: 20 });
  const rex = await crearReservaParaExamen({ solicitanteId: docente.id, aulaId: aula3.id, fecha: "2025-12-15", horaInicio: "08:00", horaFin: "10:00", materia: "Prog", mesa: "1", observaciones: undefined });
    const actualizado = await actualizarReservaExamen(rex.id, docente.id, { fecha: "2025-12-16", horaInicio: "09:00", horaFin: "11:00", materia: "Prog", mesa: "2", observaciones: "obs" });
    expect(actualizado.estado).toBe(RESERVA_ESTADO.PENDIENTE);

    const rechazado = await rechazarReservaExamen(actualizado.id, directivo.id, "no");
    expect(rechazado.estado).toBe(RESERVA_ESTADO.RECHAZADA);

  const rex2 = await crearReservaParaExamen({ solicitanteId: docente.id, aulaId: aula3.id, fecha: "2026-01-20", horaInicio: "09:00", horaFin: "10:00", materia: undefined, mesa: undefined, observaciones: undefined });
    const cancelado = await cancelarReservaExamen(rex2.id, docente.id);
    expect(cancelado.estado).toBe(RESERVA_ESTADO.CANCELADA);
  });

  test("crearReservaMultiple exitoso y disponibilidad/orden", async () => {
    const aulaX = await Aula.create({ numero: 220, ubicacion: "P4", capacidad: 25 });
    const res = await crearReservaMultiple({
      solicitanteId: docente.id,
      aulaId: aulaX.id,
      reservas: [
        { diaSemana: 2, horaInicio: "08:00", horaFin: "10:00", observaciones: "R1" },
        { diaSemana: 5, horaInicio: "10:00", horaFin: "12:00", observaciones: "R2" },
      ],
    });
    expect(res).toHaveLength(2);
    const d1 = await disponibilidad({ aulaId: aulaX.id, diaSemana: 2, horaInicio: "08:00", horaFin: "10:00" });
    expect(d1.available).toBe(true);
  });

  test("aprobarReserva: conflictos a la hora de aprobar, not-found y estado inválido", async () => {
    const aulaY = await Aula.create({ numero: 221, ubicacion: "P4", capacidad: 25 });
    const r1 = await crearReserva({ solicitanteId: docente.id, aulaId: aulaY.id, diaSemana: 3, horaInicio: "08:00", horaFin: "10:00", observaciones: undefined });
    const r2 = await crearReserva({ solicitanteId: docente.id, aulaId: aulaY.id, diaSemana: 3, horaInicio: "09:00", horaFin: "11:00", observaciones: undefined });
    const ap1 = await aprobarReserva(r1.id, directivo.id);
    expect(ap1.estado).toBe(RESERVA_ESTADO.APROBADA);
    await expect(aprobarReserva(r2.id, directivo.id)).rejects.toThrow(/Conflicto detectado al aprobar/);
    await expect(aprobarReserva(999999, directivo.id)).rejects.toThrow(/no encontrada/);
    await expect(aprobarReserva(r1.id, directivo.id)).rejects.toThrow(/PENDIENTE/);
  });

  test("rechazarReserva sin motivo no altera observaciones", async () => {
    const aulaZ = await Aula.create({ numero: 222, capacidad: 10, ubicacion: "P5" });
    const r = await crearReserva({ solicitanteId: docente.id, aulaId: aulaZ.id, diaSemana: 2, horaInicio: "12:00", horaFin: "13:00", observaciones: undefined });
    const rr = await rechazarReserva(r.id, directivo.id);
    expect(rr.estado).toBe(RESERVA_ESTADO.RECHAZADA);
    expect(rr.observaciones ?? null).toBeNull();
  });

  test("cancelarReserva: usuario incorrecto y estado inválido", async () => {
    const aulaC = await Aula.create({ numero: 223, capacidad: 10, ubicacion: "P5" });
    const r = await crearReserva({ solicitanteId: docente.id, aulaId: aulaC.id, diaSemana: 2, horaInicio: "14:00", horaFin: "15:00", observaciones: undefined });
    await expect(cancelarReserva(r.id, directivo.id)).rejects.toThrow(/otro usuario/);

    const r2 = await crearReserva({ solicitanteId: docente.id, aulaId: aulaC.id, diaSemana: 2, horaInicio: "16:00", horaFin: "17:00", observaciones: undefined });
    await rechazarReserva(r2.id, directivo.id, "no");
    await expect(cancelarReserva(r2.id, docente.id)).rejects.toThrow(/Solo se pueden cancelar/);
  });

  test("actualizarReserva éxito y reglas previas", async () => {
    const aulaU = await Aula.create({ numero: 224, capacidad: 20, ubicacion: "P6" });
    const r = await crearReserva({ solicitanteId: docente.id, aulaId: aulaU.id, diaSemana: 6, horaInicio: "08:00", horaFin: "09:00", observaciones: undefined });
    const ap = await aprobarReserva(r.id, directivo.id);
    expect(ap.estado).toBe(RESERVA_ESTADO.APROBADA);
    const upd = await actualizarReserva(r.id, docente.id, { diaSemana: 6, horaInicio: "09:00", horaFin: "10:00", observaciones: "moved" });
    expect(upd.estado).toBe(RESERVA_ESTADO.PENDIENTE);
    expect(upd.aprobadoPorId).toBeNull();
  });

  test("obtenerPorId retorna null para inexistente", async () => {
    const none = await obtenerPorId(99999999);
    expect(none).toBeNull();
  });

  test("crearReservaParaExamen validaciones de franja y aula inexistente", async () => {
    await expect(crearReservaParaExamen({ solicitanteId: docente.id, aulaId: 999999, fecha: "2026-02-02", horaInicio: "10:00", horaFin: "10:00", materia: undefined, mesa: undefined, observaciones: undefined })).rejects.toThrow(/duración 0/);
    await expect(crearReservaParaExamen({ solicitanteId: docente.id, aulaId: 999999, fecha: "2026-02-02", horaInicio: "11:00", horaFin: "10:00", materia: undefined, mesa: undefined, observaciones: undefined })).rejects.toThrow(/menor a horaFin/);
    await expect(crearReservaParaExamen({ solicitanteId: docente.id, aulaId: 999999, fecha: "2026-02-02", horaInicio: "10:00", horaFin: "11:00", materia: undefined, mesa: undefined, observaciones: undefined })).rejects.toThrow(/Aula no encontrada/);
  });

  test("aprobarReservaExamen: conflictos a la hora de aprobar, not-found y estado inválido", async () => {
    const aulaE = await Aula.create({ numero: 225, ubicacion: "P7", capacidad: 30 });
  const e1 = await crearReservaParaExamen({ solicitanteId: docente.id, aulaId: aulaE.id, fecha: "2026-03-10", horaInicio: "08:00", horaFin: "10:00", materia: undefined, mesa: undefined, observaciones: undefined });
  const e2 = await crearReservaParaExamen({ solicitanteId: docente.id, aulaId: aulaE.id, fecha: "2026-03-10", horaInicio: "09:00", horaFin: "11:00", materia: undefined, mesa: undefined, observaciones: undefined });
    const ap = await aprobarReservaExamen(e1.id, directivo.id);
    expect(ap.estado).toBe(RESERVA_ESTADO.APROBADA);
    await expect(aprobarReservaExamen(e2.id, directivo.id)).rejects.toThrow(/Conflicto detectado al aprobar/);
    await expect(aprobarReservaExamen(999999, directivo.id)).rejects.toThrow(/no encontrada/);
    await expect(aprobarReservaExamen(e1.id, directivo.id)).rejects.toThrow(/PENDIENTE/);
  });

  test("rechazarReservaExamen sin motivo y cancelarReservaExamen errores", async () => {
    const aulaE2 = await Aula.create({ numero: 226, ubicacion: "P7", capacidad: 30 });
  const e = await crearReservaParaExamen({ solicitanteId: docente.id, aulaId: aulaE2.id, fecha: "2026-03-15", horaInicio: "10:00", horaFin: "12:00", materia: undefined, mesa: undefined, observaciones: undefined });
    const rej = await rechazarReservaExamen(e.id, directivo.id);
    expect(rej.estado).toBe(RESERVA_ESTADO.RECHAZADA);
    expect(rej.observaciones ?? null).toBeNull();

  const e2 = await crearReservaParaExamen({ solicitanteId: docente.id, aulaId: aulaE2.id, fecha: "2026-03-16", horaInicio: "08:00", horaFin: "09:00", materia: undefined, mesa: undefined, observaciones: undefined });
    await expect(cancelarReservaExamen(e2.id, directivo.id)).rejects.toThrow(/otro usuario/);

  const e3 = await crearReservaParaExamen({ solicitanteId: docente.id, aulaId: aulaE2.id, fecha: "2026-03-17", horaInicio: "08:00", horaFin: "09:00", materia: undefined, mesa: undefined, observaciones: undefined });
    const rej2 = await rechazarReservaExamen(e3.id, directivo.id, "no");
    await expect(cancelarReservaExamen(rej2.id, docente.id)).rejects.toThrow(/Solo se pueden cancelar/);
  });

  test("actualizarReservaExamen: errores por usuario y estado", async () => {
    const aulaE3 = await Aula.create({ numero: 227, ubicacion: "P8", capacidad: 30 });
  const e = await crearReservaParaExamen({ solicitanteId: docente.id, aulaId: aulaE3.id, fecha: "2026-04-01", horaInicio: "08:00", horaFin: "09:00", materia: undefined, mesa: undefined, observaciones: undefined });
  await expect(actualizarReservaExamen(e.id, directivo.id, { fecha: "2026-04-02", horaInicio: "09:00", horaFin: "10:00", materia: undefined, mesa: undefined, observaciones: undefined })).rejects.toThrow(/otro usuario/);
    const cancel = await cancelarReservaExamen(e.id, docente.id);
    expect(cancel.estado).toBe(RESERVA_ESTADO.CANCELADA);
  await expect(actualizarReservaExamen(e.id, docente.id, { fecha: "2026-04-03", horaInicio: "09:00", horaFin: "10:00", materia: undefined, mesa: undefined, observaciones: undefined })).rejects.toThrow(/Solo se pueden editar/);
  });

  test("listarReservasAprobadasDeAula y Examen: errores de parámetros", async () => {
    await expect(listarReservasAprobadasDeAula(null)).rejects.toThrow(/requerido/);
    await expect(listarReservasAprobadasDeAula("abc")).rejects.toThrow(/inválido/);
    await expect(listarReservasExamenAprobadasDeAula(undefined)).rejects.toThrow(/requerido/);
    await expect(listarReservasExamenAprobadasDeAula("abc")).rejects.toThrow(/inválido/);
  });

  test("verificarConflictos excluye mi propia reserva con excluirId", async () => {
    const aulaV = await Aula.create({ numero: 228, ubicacion: "P9", capacidad: 10 });
    const r = await crearReserva({ solicitanteId: docente.id, aulaId: aulaV.id, diaSemana: 1, horaInicio: "10:00", horaFin: "12:00", observaciones: undefined });
    await aprobarReserva(r.id, directivo.id);
    const confIncluye = await verificarConflictos({ aulaId: aulaV.id, diaSemana: 1, horaInicio: "10:30", horaFin: "11:30" });
    expect(confIncluye.length).toBeGreaterThanOrEqual(1);
    const confExcluye = await verificarConflictos({ aulaId: aulaV.id, diaSemana: 1, horaInicio: "10:30", horaFin: "11:30", excluirId: r.id });
    expect(confExcluye.length).toBe(0);
  });

  test("duplicada regular del mismo usuario es bloqueada; distinto usuario permitida", async () => {
    const aulaDup = await Aula.create({ numero: 300, ubicacion: "P10", capacidad: 20 });
    // Crear una reserva pendiente del docente
    const r1 = await crearReserva({ solicitanteId: docente.id, aulaId: aulaDup.id, diaSemana: 1, horaInicio: "08:00", horaFin: "12:00", observaciones: undefined });
    expect(r1.estado).toBe(RESERVA_ESTADO.PENDIENTE);
    // Intentar duplicarla con el mismo usuario
    await expect(
      crearReserva({ solicitanteId: docente.id, aulaId: aulaDup.id, diaSemana: 1, horaInicio: "08:00", horaFin: "12:00", observaciones: undefined })
    ).rejects.toThrow(/ya tienes una reserva pendiente/i);

    // Distinto usuario (directivo) debe poder crear la misma franja
    const r2 = await crearReserva({ solicitanteId: directivo.id, aulaId: aulaDup.id, diaSemana: 1, horaInicio: "08:00", horaFin: "12:00", observaciones: undefined });
    expect(r2.estado).toBe(RESERVA_ESTADO.PENDIENTE);
  });

  test("duplicada de examen del mismo usuario bloqueada; distinto usuario permitida", async () => {
    const aulaDupE = await Aula.create({ numero: 301, ubicacion: "P10", capacidad: 20 });
    const fecha = "2026-05-01";
    // Crear examen pendiente del docente
    const e1 = await crearReservaParaExamen({ solicitanteId: docente.id, aulaId: aulaDupE.id, fecha, horaInicio: "10:00", horaFin: "12:00", materia: "Alg", mesa: "1", observaciones: undefined });
    expect(e1.estado).toBe(RESERVA_ESTADO.PENDIENTE);
    // Intentar duplicarla con el mismo usuario
    await expect(
      crearReservaParaExamen({ solicitanteId: docente.id, aulaId: aulaDupE.id, fecha, horaInicio: "10:00", horaFin: "12:00", materia: "Alg", mesa: "1", observaciones: undefined })
    ).rejects.toThrow(/ya tienes una reserva de examen pendiente/i);

    // Distinto usuario puede
    const e2 = await crearReservaParaExamen({ solicitanteId: directivo.id, aulaId: aulaDupE.id, fecha, horaInicio: "10:00", horaFin: "12:00", materia: "Alg", mesa: "1", observaciones: undefined });
    expect(e2.estado).toBe(RESERVA_ESTADO.PENDIENTE);
  });

  test("duración mínima y máxima para regulares", async () => {
    const aulaD = await Aula.create({ numero: 302, ubicacion: "P11", capacidad: 25 });
    // Menos de 30 minutos
    await expect(
      crearReserva({ solicitanteId: docente.id, aulaId: aulaD.id, diaSemana: 2, horaInicio: "08:00", horaFin: "08:20", observaciones: undefined })
    ).rejects.toThrow(/al menos 30 minutos/i);
    // Más de 8 horas
    await expect(
      crearReserva({ solicitanteId: docente.id, aulaId: aulaD.id, diaSemana: 2, horaInicio: "08:00", horaFin: "16:30", observaciones: undefined })
    ).rejects.toThrow(/más de 8 horas/i);
  });

  test("duración mínima y máxima para examen", async () => {
    const aulaDE = await Aula.create({ numero: 303, ubicacion: "P11", capacidad: 25 });
    const fecha = "2026-06-10";
    // Menos de 30 minutos
    await expect(
      crearReservaParaExamen({ solicitanteId: docente.id, aulaId: aulaDE.id, fecha, horaInicio: "09:00", horaFin: "09:20", materia: "X", mesa: "1", observaciones: undefined })
    ).rejects.toThrow(/al menos 30 minutos/i);
    // Más de 6 horas
    await expect(
      crearReservaParaExamen({ solicitanteId: docente.id, aulaId: aulaDE.id, fecha, horaInicio: "08:00", horaFin: "15:00", materia: "X", mesa: "1", observaciones: undefined })
    ).rejects.toThrow(/más de 6 horas/i);
  });

  test("una vez aprobada, ya no cuenta como duplicada (regular) pero genera Conflicto", async () => {
    const aulaReg = await Aula.create({ numero: 304, ubicacion: "P12", capacidad: 20 });
    const rPend = await crearReserva({ solicitanteId: docente.id, aulaId: aulaReg.id, diaSemana: 3, horaInicio: "08:00", horaFin: "12:00", observaciones: undefined });
    expect(rPend.estado).toBe(RESERVA_ESTADO.PENDIENTE);
    const rAprob = await aprobarReserva(rPend.id, directivo.id);
    expect(rAprob.estado).toBe(RESERVA_ESTADO.APROBADA);
    // Ahora crear otra igual (mismo usuario, misma franja) no se considera duplicada, pero sí debe
    // fallar por conflicto contra una reserva APROBADA
    await expect(
      crearReserva({ solicitanteId: docente.id, aulaId: aulaReg.id, diaSemana: 3, horaInicio: "08:00", horaFin: "12:00", observaciones: undefined })
    ).rejects.toThrow(/Conflicto/);
  });

  test("una vez aprobada, ya no cuenta como duplicada (examen)", async () => {
    const aulaEx = await Aula.create({ numero: 305, ubicacion: "P12", capacidad: 20 });
    const fecha = "2026-07-20";
    const ePend = await crearReservaParaExamen({ solicitanteId: docente.id, aulaId: aulaEx.id, fecha, horaInicio: "10:00", horaFin: "12:00", materia: "Alg", mesa: "1", observaciones: undefined });
    expect(ePend.estado).toBe(RESERVA_ESTADO.PENDIENTE);
    const eAprob = await aprobarReservaExamen(ePend.id, directivo.id);
    expect(eAprob.estado).toBe(RESERVA_ESTADO.APROBADA);
    // Crear otra igual ya no se considera duplicada
    const eNueva = await crearReservaParaExamen({ solicitanteId: docente.id, aulaId: aulaEx.id, fecha, horaInicio: "10:00", horaFin: "12:00", materia: "Alg", mesa: "1", observaciones: undefined });
    expect(eNueva.estado).toBe(RESERVA_ESTADO.PENDIENTE);
    // Pero al intentar aprobar la segunda, debe fallar por conflicto
    await expect(aprobarReservaExamen(eNueva.id, directivo.id)).rejects.toThrow(/Conflicto/);
  });
});
