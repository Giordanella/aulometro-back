import sequelize from "../../src/config/db.js";
import User from "../../src/models/user.js";
import { USER_ROLES } from "../../src/config/roles.js";
import bcrypt from "bcrypt";

describe("User model - branch coverage for hooks and scopes", () => {
  beforeAll(async () => {
    await sequelize.sync({ force: true });
  });

  test("defaultScope excludes passwordHash; withPassword includes and is hashed", async () => {
    const rawPassword = "secret123";
    const u = await User.create({
      name: "Alice",
      email: "alice@test.com",
      password: rawPassword, // uses virtual setter; copies into passwordHash for hook
      role: USER_ROLES.DOCENTE,
    });

    // Default scope should not include passwordHash
    const fetched = await User.findByPk(u.id); // defaultScope
    const plain = fetched.get ? fetched.get({ plain: true }) : fetched;
    expect(plain.passwordHash).toBeUndefined();

    // Scope withPassword should include passwordHash and it should be hashed (not equal to raw)
    const withPass = await User.scope("withPassword").findByPk(u.id);
    const wp = withPass.get ? withPass.get({ plain: true }) : withPass;
    expect(typeof wp.passwordHash).toBe("string");
    expect(wp.passwordHash).not.toBe(rawPassword);
    const ok = await bcrypt.compare(rawPassword, wp.passwordHash);
    expect(ok).toBe(true);
  });

  test("beforeSave hook not triggered when passwordHash not changed (hash remains same)", async () => {
    const raw = "anotherpass";
    const bob = await User.create({ name: "Bob", email: "bob@test.com", password: raw, role: USER_ROLES.DOCENTE });

    const before = await User.scope("withPassword").findByPk(bob.id);
    const beforeHash = before.get({ plain: true }).passwordHash;

    // Update only the name (no password or passwordHash changes)
    await bob.update({ name: "Bobby" });

    const after = await User.scope("withPassword").findByPk(bob.id);
    const afterHash = after.get({ plain: true }).passwordHash;
    expect(afterHash).toBe(beforeHash); // branch where changed('passwordHash') is false
  });

  test("password virtual setter: falsy value does not modify hash (else branch)", async () => {
    const raw = "xpass";
    const user = await User.create({ name: "Eli", email: "eli@test.com", password: raw, role: USER_ROLES.DOCENTE });

    const before = await User.scope("withPassword").findByPk(user.id);
    const beforeHash = before.get({ plain: true }).passwordHash;

    // Set virtual password to a falsy value => setter runs but does not set passwordHash
    user.set("password", "");
    await user.save();

    const after = await User.scope("withPassword").findByPk(user.id);
    const afterHash = after.get({ plain: true }).passwordHash;
    expect(afterHash).toBe(beforeHash);
  });

  test("role default is DOCENTE and can be DIRECTIVO explicitly", async () => {
    const c = await User.create({ name: "Carol", email: "carol@test.com", password: "p", role: undefined });
    const cPlain = c.get({ plain: true });
    expect(cPlain.role).toBe(USER_ROLES.DOCENTE);

    const d = await User.create({ name: "Dan", email: "dan@test.com", password: "p", role: USER_ROLES.DIRECTIVO });
    const dPlain = d.get({ plain: true });
    expect(dPlain.role).toBe(USER_ROLES.DIRECTIVO);
  });

  test("email validation and uniqueness are enforced", async () => {
    await expect(
      User.create({ name: "Eva", email: "not-an-email", password: "p" })
    ).rejects.toThrow();

    await User.create({ name: "Frank", email: "frank@test.com", password: "p" });
    await expect(
      User.create({ name: "Frank2", email: "frank@test.com", password: "p" })
    ).rejects.toThrow();
  });
});
