import sequelize from "../../src/config/db.js";
import Aula from "../../src/models/aula.js";
import {
  createAula,
  findAll,
  findById,
  updateById,
  removeById,
  removeAll,
  buscarAulas,
  getByNumero,
} from "../../src/services/aulaService.js";

beforeAll(async () => {
  await sequelize.sync({ force: true });
});

// No cerramos aquí; otros suites se encargan de cerrar la conexión si hace falta.

let aulaId;

test("createAula crea correctamente un aula", async () => {
  const aula = await createAula({
    numero: 200,
    ubicacion: "Edificio B",
    capacidad: 30,
    computadoras: 5,
    tieneProyector: false,
  });

  const aulaPlain = aula.get ? aula.get({ plain: true }) : aula;
  aulaId = aulaPlain.id;

  expect(aulaPlain.id).toBeDefined();
  expect(aulaPlain.estado).toBe("disponible");
  expect(aulaPlain.numero).toBe(200);
});

test("findAll devuelve aulas creadas", async () => {
  const data = await findAll();
  expect(data.count).toBeGreaterThanOrEqual(1);
  expect(Array.isArray(data.rows)).toBe(true);
  const first = data.rows[0].get ? data.rows[0].get({ plain: true }) : data.rows[0];
  expect(first).toHaveProperty("numero");
});

test("findById devuelve el aula por su id", async () => {
  const aula = await findById(aulaId);
  const aulaPlain = aula.get ? aula.get({ plain: true }) : aula;
  expect(aulaPlain.id).toBe(aulaId);
  expect(aulaPlain.numero).toBe(200);
});

test("updateById actualiza correctamente los campos", async () => {
  const aula = await updateById(aulaId, {
    ubicacion: "Edificio C",
    capacidad: 35,
    tieneProyector: true,
  });

  const aulaPlain = aula.get ? aula.get({ plain: true }) : aula;
  expect(aulaPlain.ubicacion).toBe("Edificio C");
  expect(aulaPlain.capacidad).toBe(35);
  expect(aulaPlain.tieneProyector).toBe(true);
});

test("buscarAulas por filtros básicos", async () => {
  // Añadir otra aula para tener variedad
  await createAula({ numero: 201, ubicacion: "Edificio B", capacidad: 28, computadoras: 0, tieneProyector: false });
  const r1 = await buscarAulas({ ubicacion: "B" });
  expect(r1.length).toBeGreaterThan(0);
  const r2 = await buscarAulas({ capacidadMin: 30 });
  expect(r2.every(a => a.capacidad >= 30)).toBe(true);
});

test("getByNumero funciona y valida entradas", async () => {
  const a = await getByNumero(200);
  expect(a).toBeTruthy();
  await expect(getByNumero(undefined)).rejects.toThrow(/requerido/);
  await expect(getByNumero("abc")).rejects.toThrow(/inválido/);
});

test("removeById elimina el aula", async () => {
  const deleted = await removeById(aulaId);
  expect(deleted).toBe(1);

  const existe = await Aula.findByPk(aulaId);
  expect(existe).toBeNull();
});

test("removeAll borra todo y retorna count", async () => {
  await createAula({ numero: 300, ubicacion: "P1", capacidad: 20 });
  const before = await Aula.count();
  const deletedCount = await removeAll();
  expect(deletedCount).toBe(before);
  const after = await Aula.count();
  expect(after).toBe(0);
});
