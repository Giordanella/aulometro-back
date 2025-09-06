// Proposito-> chequear si el user es docente o directivo. CORREGIR CUANDO HAYA AUTENTICACION(LOGIN)

export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    const role = req.header("role"); // TEMPORAL: mientras no haya auth real, lee el rol de un header
    if (!role || !allowedRoles.includes(role)) {
      return res.status(403).json({ message: "Access denied" });
    }
    // si ya tuvieras JWT, req.user.role = payload.role y leerías de ahí
    next();
  };
}
