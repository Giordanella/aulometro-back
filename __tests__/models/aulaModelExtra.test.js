import sequelize from "../../src/config/db.js";
import Aula from "../../src/models/aula.js";

describe("Modelo Aula - validaciones y defaults", () => {
  beforeAll(async () => {
    await sequelize.sync({ force: true });
  });

  test("crea aula válida y aplica defaults", async () => {
    const a = await Aula.create({ numero: 10, ubicacion: "P1", capacidad: 20 });
    const p = a.get ? a.get({ plain: true }) : a;
    expect(p.computadoras).toBe(0); // default
    expect(p.tieneProyector).toBe(false); // default
    expect(p.estado).toBe("disponible"); // default
  });

  test("numero < 1 dispara validación", async () => {
    await expect(Aula.create({ numero: 0, ubicacion: "P1", capacidad: 10 })).rejects.toThrow(
      /número de aula.*mayor que 0/i
    );
  });

  test("ubicacion notEmpty", async () => {
    await expect(Aula.create({ numero: 11, ubicacion: "", capacidad: 10 })).rejects.toThrow(
      /ubicación no puede estar vacía/i
    );
  });

  test("capacidad mínima 1", async () => {
    await expect(Aula.create({ numero: 12, ubicacion: "P1", capacidad: 0 })).rejects.toThrow(
      /capacidad.*al menos 1/i
    );
  });

  test("computadoras no negativo y no mayor a capacidad", async () => {
    await expect(
      Aula.create({ numero: 13, ubicacion: "P1", capacidad: 5, computadoras: -1 })
    ).rejects.toThrow(/no puede ser negativa/i);

    await expect(
      Aula.create({ numero: 14, ubicacion: "P1", capacidad: 5, computadoras: 6 })
    ).rejects.toThrow(/computadoras.*más que la capacidad/i);
  });

  test("estado permitido y unique numero", async () => {
    const ok = await Aula.create({ numero: 15, ubicacion: "P2", capacidad: 10, estado: "ocupada" });
    expect(ok.get({ plain: true }).estado).toBe("ocupada");

    // Estado inválido
    await expect(
      Aula.create({ numero: 16, ubicacion: "P2", capacidad: 10, estado: "cerrada" })
    ).rejects.toThrow(/estado.*disponible, ocupada o mantenimiento/i);

    // Unique numero
    await expect(
      Aula.create({ numero: 15, ubicacion: "P3", capacidad: 10 })
    ).rejects.toThrow();
  });
});
