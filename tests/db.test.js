import { test, describe, after } from "node:test";
import assert from "node:assert/strict";

// Importamos la API real. Trabajamos sobre data.db creando/borrando entradas
// con prefijo único para no chocar con datos reales.
import { createSede, deleteSede, listSedes, getSede } from "../src/db.js";

const TAG = `__test_${Date.now()}_`;

after(() => {
  // limpieza por si quedó alguna entrada huérfana
  for (const s of listSedes()) {
    if (s.name.startsWith(TAG)) deleteSede(s.id);
  }
});

describe("validación de entradas", () => {
  test("rechaza nombres con caracteres peligrosos", () => {
    assert.throws(() => createSede(`${TAG}' OR 1=1; --`, ""), /caracteres no permitidos/);
    assert.throws(() => createSede(`${TAG}<script>alert(1)</script>`, ""), /caracteres no permitidos/);
    assert.throws(() => createSede(`${TAG}; DROP TABLE`, ""), /caracteres no permitidos/);
  });

  test("rechaza coordenadas mal formadas", () => {
    assert.throws(() => createSede(`${TAG}coords1`, "no son coords"), /formato/);
    assert.throws(() => createSede(`${TAG}coords2`, "1.0,abc"), /formato/);
  });

  test("acepta y persiste nombres y coords válidas", () => {
    const sede = createSede(`${TAG}OK`, "1.5,-2.0,3,4");
    assert.equal(sede.name, `${TAG}OK`);
    assert.equal(sede.coords, "1.5,-2.0,3,4");

    const fetched = getSede(sede.id);
    assert.equal(fetched.name, sede.name);

    deleteSede(sede.id);
    assert.equal(getSede(sede.id), undefined);
  });

  test("nombre vacío no se acepta", () => {
    assert.throws(() => createSede("", ""), /no puede estar vacío/);
    assert.throws(() => createSede("   ", ""), /no puede estar vacío/);
  });

  test("nombre duplicado falla", () => {
    const a = createSede(`${TAG}dup`, "");
    assert.throws(() => createSede(`${TAG}dup`, ""), /Ya existe/);
    deleteSede(a.id);
  });
});
