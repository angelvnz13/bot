// Inspector rápido de la base de datos.
// Uso: node scripts/inspectDb.js [tabla]
// Sin argumento muestra resumen de todas las tablas.

import db from "../src/db.js";

const tabla = process.argv[2];

function dump(name) {
  console.log(`\n=== ${name} ===`);
  const rows = db.prepare(`SELECT * FROM ${name}`).all();
  if (!rows.length) {
    console.log("(vacía)");
    return;
  }
  console.table(rows);
}

if (tabla) {
  dump(tabla);
} else {
  const tablas = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
    .all()
    .map((r) => r.name);
  console.log("Tablas:", tablas);
  for (const t of tablas) dump(t);
}
