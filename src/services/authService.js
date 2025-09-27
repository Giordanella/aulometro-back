import bcrypt from "bcrypt";
import User from "../models/user.js";
import { toUserDTO } from "../dtos/dtos.js";

export async function loginWithEmailPassword(email, password) {
  const user = await User.scope("withPassword").findOne({ where: { email } });

  if (!user || !user.passwordHash) {
    throw new Error("Invalid credentials");
  }

  const ok = await bcrypt.compare(String(password), String(user.passwordHash));
  if (!ok) {
    throw new Error("Invalid credentials");
  }

  return toUserDTO(user);
}
