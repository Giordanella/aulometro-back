/**
 * Tests de crearReserva y validaciones de bordes
 */
import dotenv from "dotenv";
dotenv.config();

import sequelize from "../../src/config/db.js";
import Aula from "../../src/models/aula.js";
import User from "../../src/models/user.js";
import { crearReserva, aprobarReserva, crearReservaMultiple, disponibilidad } from "../../src/services/reservaService.js";
import Reserva from "../../src/models/reserva.js";
import { RESERVA_ESTADO } from "../../src/config/reservas.js";

describe("ReservaService crearReserva - casos borde", () => {
  let docente;
  let directivo;
  let aula;

  beforeAll(async () => {
    // Usar una base de datos de test definida por envs, por ejemplo DB_NAME_TEST
    // Si usás la misma DB, ideal usar un schema o limpiar al inicio.
    await sequelize.sync({ force: true });
    // Crear datos base
    docente = await User.create({ name: "Doc", email: "doc@test.com", password: "123456", role: "DOCENTE" });
    directivo = await User.create({ name: "Dir", email: "dir@test.com", password: "123456", role: "DIRECTIVO" });
    aula = await Aula.create({ numero: 112, ubicacion: "P1", capacidad: 30, computadoras: 10, tieneProyector: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  test("falla si faltan campos obligatorios", async () => {
    await expect(
      crearReserva({ solicitanteId: docente.id, aulaId: aula.id, diaSemana: 1, horaInicio: null, horaFin: null, observaciones: undefined })
    ).rejects.toThrow(/obligatorios/);

    await expect(
      crearReserva({ solicitanteId: null, aulaId: aula.id, diaSemana: 1, horaInicio: "10:00", horaFin: "12:00", observaciones: undefined })
    ).rejects.toThrow(/obligatorios/);
  });

  test("falla si el aula no existe", async () => {
    await expect(
      crearReserva({ solicitanteId: docente.id, aulaId: 999999, diaSemana: 2, horaInicio: "10:00", horaFin: "12:00", observaciones: undefined })
    ).rejects.toThrow(/Aula no encontrada/);
  });

  test("falla por validación de modelo cuando horaFin <= horaInicio", async () => {
    await expect(
      crearReserva({ solicitanteId: docente.id, aulaId: aula.id, diaSemana: 3, horaInicio: "12:00", horaFin: "12:00", observaciones: undefined })
    ).rejects.toThrow(/horaFin debe ser mayor que horaInicio/);

    await expect(
      crearReserva({ solicitanteId: docente.id, aulaId: aula.id, diaSemana: 3, horaInicio: "13:00", horaFin: "12:59", observaciones: undefined })
    ).rejects.toThrow(/horaFin debe ser mayor que horaInicio/);
  });

  test("crea OK y normaliza hora a HH:mm:ss", async () => {
  const r = await crearReserva({ solicitanteId: docente.id, aulaId: aula.id, diaSemana: 4, horaInicio: "12:30", horaFin: "14:30", observaciones: undefined });
    expect(r.horaInicio).toBe("12:30:00");
    expect(r.horaFin).toBe("14:30:00");
    expect(r.estado).toBe(RESERVA_ESTADO.PENDIENTE);
  });

  test("detecta conflicto contra reserva aprobada", async () => {
    // Creamos una reserva y la aprobamos en jueves 16:00-18:00
  const rPend = await crearReserva({ solicitanteId: docente.id, aulaId: aula.id, diaSemana: 4, horaInicio: "16:00", horaFin: "18:00", observaciones: undefined });
    const rAprob = await aprobarReserva(rPend.id, directivo.id);
    expect(rAprob.estado).toBe(RESERVA_ESTADO.APROBADA);

    // Intento de solapamiento
    await expect(
      crearReserva({ solicitanteId: docente.id, aulaId: aula.id, diaSemana: 4, horaInicio: "17:00", horaFin: "19:00", observaciones: undefined })
    ).rejects.toThrow(/Conflicto/);

    // Borde: franja adyacente sin solapamiento (fin == inicio) se permite
    const rOk = await crearReserva({ solicitanteId: docente.id, aulaId: aula.id, diaSemana: 4, horaInicio: "18:00", horaFin: "19:00", observaciones: undefined });
    expect(rOk.estado).toBe(RESERVA_ESTADO.PENDIENTE);
  });

  test("crear múltiples franjas en batch y chequear disponibilidad posterior", async () => {
    // Crear un aula distinta para no interferir con otras pruebas
  const aulaBatch = await Aula.create({ numero: 210, ubicacion: "P2", capacidad: 40, computadoras: 20, tieneProyector: false });
  const aulaBatchId = (aulaBatch.get ? aulaBatch.get({ plain: true }) : aulaBatch).id;

    // Crear dos franjas para la misma aula en un solo batch
    const batch = await crearReservaMultiple({
      solicitanteId: docente.id,
  aulaId: aulaBatchId,
      reservas: [
        { diaSemana: 1, horaInicio: "12:30", horaFin: "14:30", observaciones: "Clase A" },
        { diaSemana: 4, horaInicio: "16:00", horaFin: "18:00", observaciones: "Clase B" },
      ],
    });

    expect(Array.isArray(batch)).toBe(true);
    expect(batch).toHaveLength(2);
    expect(batch[0].estado).toBe(RESERVA_ESTADO.PENDIENTE);
    expect(batch[0].horaInicio).toBe("12:30:00");
    expect(batch[0].horaFin).toBe("14:30:00");
    expect(batch[1].horaInicio).toBe("16:00:00");
    expect(batch[1].horaFin).toBe("18:00:00");

    // Como están PENDIENTE, la disponibilidad debe seguir libre (solo bloquea APROBADA)
  const dispLunes = await disponibilidad({ aulaId: aulaBatchId, diaSemana: 1, horaInicio: "12:30", horaFin: "14:30" });
    expect(dispLunes.available).toBe(true);
    expect(dispLunes.conflicts).toHaveLength(0);

    // Aprobamos la primera franja (lunes 12:30-14:30)
    const aprobada = await aprobarReserva(batch[0].id, directivo.id);
    expect(aprobada.estado).toBe(RESERVA_ESTADO.APROBADA);

    // Ahora la disponibilidad para esa franja debe estar ocupada
  const dispLunes2 = await disponibilidad({ aulaId: aulaBatchId, diaSemana: 1, horaInicio: "12:30", horaFin: "14:30" });
    expect(dispLunes2.available).toBe(false);
    expect(dispLunes2.conflicts.length).toBeGreaterThanOrEqual(1);

    // La otra franja (jueves 16:00-18:00) aún está libre hasta ser aprobada
  const dispJueves = await disponibilidad({ aulaId: aulaBatchId, diaSemana: 4, horaInicio: "16:00", horaFin: "18:00" });
    expect(dispJueves.available).toBe(true);
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

    // Verificar que NO quedó nada creado (rollback)
    const creadas = await Reserva.findAll({ where: { aulaId: aulaBatch2Id } });
    expect(creadas).toHaveLength(0);
  });
});
