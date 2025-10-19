import { RESERVA_ESTADO, DIAS_SEMANA, normalizarHora } from "../../src/config/reservas.js";
import { USER_ROLES } from "../../src/config/roles.js";

test("normalizarHora convierte HH:mm a HH:mm:ss y preserva HH:mm:ss", () => {
  expect(normalizarHora("8:5")).toBe("08:05:00");
  expect(normalizarHora("08:05")).toBe("08:05:00");
  expect(normalizarHora("08:05:07")).toBe("08:05:07");
  expect(normalizarHora(123)).toBe(123);
});

test("constantes RESERVA_ESTADO y DIAS_SEMANA", () => {
  expect(RESERVA_ESTADO.PENDIENTE).toBe("PENDIENTE");
  expect(DIAS_SEMANA.LUNES).toBe(1);
});

test("USER_ROLES contiene DOCENTE y DIRECTIVO", () => {
  expect(USER_ROLES.DOCENTE).toBe("DOCENTE");
  expect(USER_ROLES.DIRECTIVO).toBe("DIRECTIVO");
});
