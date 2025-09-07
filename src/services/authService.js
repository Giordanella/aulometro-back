import bcrypt from "bcrypt";
import User from "../models/user.js";

/**
 * Login por email + password.
 * Devuelve el usuario “limpio” (sin passwordHash) o null si no coincide.
 */
export async function loginWithEmailPassword(email, password) {
  // necesitamos leer passwordHash, por eso usamos unscoped()
  const user = await User.unscoped().findOne({ where: { email } });

  if (!user || !user.passwordHash) {
    throw new Error("Invalid credentials");
  }

  const ok = await bcrypt.compare(String(password), String(user.passwordHash));
  if (!ok) {
    throw new Error("Invalid password");
  }
  // Limpiamos el hash antes de devolver
  const plain = user.get({ plain: true });
  delete plain.passwordHash;
  return plain;
}
