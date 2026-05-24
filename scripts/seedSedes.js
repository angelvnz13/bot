// Sembrado de sedes.
//
// Por defecto es ADITIVO: solo añade las que aún no existen, no borra nada.
//   node scripts/seedSedes.js
//
// Con --reset borra TODA la tabla de sedes y reinserta la lista entera (destructivo).
//   node scripts/seedSedes.js --reset

import { createSede, listSedes, listTombstones, replaceAllSedes } from "../src/db.js";

// [nombre, coordenadas, emoji]
const SEDES = [
  ["Cristalpalace",  "1375.40,-737.98,67.96,351.03",   "💎"],
  ["Warlocks",       "-1141.12,-1752.41,5.44,351.32",  "🧙"],
  ["Roxos",          "-1806.44,457.50,128.19,351.32",  "🪨"],
  ["Sahara",         "1367.78,1147.89,114.09,357.48",  "🏜️"],
  ["Afetados",       "-1900.29,2031.15,142.15,357.48", "💀"],
  ["04",             "-1556.87,113.41,58.09,357.48",   "🔢"],
  ["Divine Ghost",   "-346.04,204.81,88.11,0.32",      "👻"],
  ["Porros family",  "-1463.83,-26.61,55.00,0.17",     "🌿"],
  ["Driftking",      "-374.76,-135.60,38.72,359.76",   "🏎️"],
  ["♛ Legacy",       "761.67,-307.87,60.07,181.49",    "👑"],
  ["A.S",            "104.03,-1938.47,19.99,181.49",   "🅰️"],
  ["Italia",         "877.43,-53.85,80.31,181.49",     "🇮🇹"],
  ["X (1)",          "205.94,1224.92,224.44,181.49",   "❌"],
  ["X (2)",          "416.73,-1522.01,29.23,181.49",   "❎"],
  ["Verdes",         "-1539.61,863.81,182.06,181.49",  "🟢"],
  ["Kaos",           "-121.87,986.58,236.15,181.49",   "🌀"],
  ["Redline",        "-2301.42,411.43,175.52,181.49",  "🔴"],
  ["Banzas",         "-3037.32,116.13,11.02,181.49",   "🦍"],
  ["Lacandela",      "1227.31,-263.22,77.62,181.49",   "🕯️"],
  ["Virtude",        "-547.21,-908.72,27.14,181.49",   "✨"],
  ["LosBandidos",    "-3420.43,535.86,10.58,210.00",   "🤠"],
];

const reset = process.argv.includes("--reset");

if (reset) {
  console.log("⚠️  Modo --reset: borrando TODAS las sedes existentes...");
  replaceAllSedes(SEDES);
} else {
  const existing = new Set(listSedes().map((s) => s.name));
  const tombstoned = new Set(listTombstones());
  let added = 0;
  let skipped = 0;
  let blocked = 0;
  for (const [name, coords, emoji] of SEDES) {
    if (existing.has(name)) {
      skipped += 1;
      continue;
    }
    if (tombstoned.has(name)) {
      blocked += 1;
      continue;
    }
    try {
      createSede(name, coords, emoji);
      added += 1;
    } catch (e) {
      console.warn(`  ⚠️  no se pudo añadir ${name}: ${e.message}`);
    }
  }
  console.log(`✅ ${added} sedes añadidas, ${skipped} ya existían, ${blocked} bloqueadas (borradas previamente).`);
  if (blocked > 0) {
    console.log(`   Para reañadir alguna borrada, créala manualmente con /sedes o ejecuta con --reset.`);
  }
}

const sedes = listSedes();
console.log(`\nTotal en la DB: ${sedes.length}`);
for (const s of sedes) {
  const emoji = s.emoji ? `${s.emoji} ` : "";
  console.log(`  - ${emoji}${s.name}: ${s.coords}`);
}
