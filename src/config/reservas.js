export const RESERVA_ESTADO = Object.freeze({
  PENDIENTE: "PENDIENTE",
  APROBADA: "APROBADA",
  RECHAZADA: "RECHAZADA",
  CANCELADA: "CANCELADA",
});

export const DIAS_SEMANA = Object.freeze({
  LUNES: 1,
  MARTES: 2,
  MIERCOLES: 3,
  JUEVES: 4,
  VIERNES: 5,
  SABADO: 6,
  DOMINGO: 7,
});

export function normalizarHora(hora) {
  // Acepta "HH:mm" o "HH:mm:ss" y devuelve "HH:mm:ss"
  if (typeof hora !== "string") return hora;
  const partes = hora.split(":");
  if (partes.length === 2) return `${partes[0].padStart(2, "0")}:${partes[1].padStart(2, "0")}:00`;
  if (partes.length === 3) return `${partes[0].padStart(2, "0")}:${partes[1].padStart(2, "0")}:${partes[2].padStart(2, "0")}`;
  return hora;
}
