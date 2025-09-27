export const USER_ROLES = Object.freeze({
  PUBLIC: "public",             // cualquier usuario, incluso no autenticado
  AUTHENTICATED: "authenticated", // cualquier usuario logueado, sin importar DOCENTE o DIRECTIVO
  DOCENTE: "DOCENTE",           // usuario con rol docente
  DIRECTIVO: "DIRECTIVO",       // usuario con rol directivo
});
