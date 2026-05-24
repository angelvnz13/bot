import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { sanitizeName, sanitizeCoords, sanitizeEmoji } from "../src/db/sanitize.js";

// Tests de la capa de validación. No dependen de DB, así que pasan sin conexión.

describe("validación de entradas", () => {
  test("rechaza nombres con caracteres peligrosos", () => {
    assert.throws(() => sanitizeName(`__test__' OR 1=1; --`), /caracteres no permitidos/);
    assert.throws(() => sanitizeName(`__test__<script>alert(1)</script>`), /caracteres no permitidos/);
    assert.throws(() => sanitizeName(`__test__; DROP TABLE`), /caracteres no permitidos/);
  });

  test("rechaza coordenadas mal formadas", () => {
    assert.throws(() => sanitizeCoords("no son coords"), /formato/);
    assert.throws(() => sanitizeCoords("1.0,abc"), /formato/);
  });

  test("acepta nombres y coords válidas", () => {
    assert.equal(sanitizeName("Sede Norte 1-2"), "Sede Norte 1-2");
    assert.equal(sanitizeCoords("1.5,-2.0,3,4"), "1.5,-2.0,3,4");
    assert.equal(sanitizeCoords(""), "");
  });

  test("nombre vacío no se acepta", () => {
    assert.throws(() => sanitizeName(""), /no puede estar vacío/);
    assert.throws(() => sanitizeName("   "), /no puede estar vacío/);
  });

  test("emoji se trunca y normaliza", () => {
    assert.equal(sanitizeEmoji("🦁"), "🦁");
    // El sanitizador quita espacios y trunca a 10 chars.
    assert.equal(sanitizeEmoji("  con espacios  "), "conespacio");
  });
});
