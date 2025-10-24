import sequelize from "../../src/config/db.js";
import Aula from "../../src/models/aula.js";
import {
  createAula,
  updateById,
  removeById,
  buscarAulas,
} from "../../src/services/aulaService.js";

describe("AulaService - branch coverage extras", () => {
  beforeAll(async () => {
    await sequelize.sync({ force: true });
  });

  test("createAula valida requeridos (numero, ubicacion, capacidad)", async () => {
    await expect(createAula({ numero: null, ubicacion: null, capacidad: null })).rejects.toThrow(/obligatorios/);
  });

  test("updateById arroja error si el aula no existe", async () => {
    await expect(updateById(999999, { ubicacion: "X" })).rejects.toThrow(/Aula no encontrada/);
  });

  test("buscarAulas cubre filtros: numero, ubicacion, capacidadMin, computadorasMin, tieneProyector true/false, estado", async () => {
    // Crear dataset variado
    const a1 = await createAula({ numero: 10, ubicacion: "Ed A", capacidad: 20, computadoras: 2, tieneProyector: true, estado: "disponible" });
    const a2 = await createAula({ numero: 11, ubicacion: "Ed B", capacidad: 30, computadoras: 0, tieneProyector: false, estado: "mantenimiento" });
    const a3 = await createAula({ numero: 12, ubicacion: "Ed AB", capacidad: 40, computadoras: 10, tieneProyector: true, estado: "disponible" });

    // numero exacto
    const fNum = await buscarAulas({ numero: 10 });
    expect(fNum.map(a => a.numero)).toEqual([10]);

    // ubicacion like
    const fUb = await buscarAulas({ ubicacion: "Ed A" });
    expect(fUb.length).toBeGreaterThan(0);

    // capacidadMin
    const fCap = await buscarAulas({ capacidadMin: 30 });
    expect(fCap.every(a => a.capacidad >= 30)).toBe(true);

    // computadorasMin
    const fPc = await buscarAulas({ computadorasMin: 5 });
    expect(fPc.every(a => a.computadoras >= 5)).toBe(true);

    // tieneProyector true (boolean or string)
    const fProjTrue = await buscarAulas({ tieneProyector: true });
    expect(fProjTrue.every(a => a.tieneProyector === true)).toBe(true);
    const fProjStr = await buscarAulas({ tieneProyector: "true" });
    expect(fProjStr.every(a => a.tieneProyector === true)).toBe(true);

    // tieneProyector false
    const fProjFalse = await buscarAulas({ tieneProyector: false });
    expect(fProjFalse.every(a => a.tieneProyector === false)).toBe(true);

    // estado
    const fEstado = await buscarAulas({ estado: "mantenimiento" });
    expect(fEstado.every(a => a.estado === "mantenimiento")).toBe(true);
  });

  test("removeById de inexistente retorna 0", async () => {
    const before = await Aula.count();
    const res = await removeById(12345678);
    expect(res).toBe(0);
    const after = await Aula.count();
    expect(after).toBe(before);
  });
});
