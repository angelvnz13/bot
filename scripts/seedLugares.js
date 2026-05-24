// Sembrado de lugares de enfrentamiento (battle_grounds).
// Por defecto reemplaza los 3 lugares hardcoded.
//   node scripts/seedLugares.js

import { listBattleGrounds, replaceAllBattleGrounds } from "../src/db.js";

const LUGARES = [
  {
    name: "Kaos",
    info: "15-20",
    coordsDef: "-124.22,993.85,235.76,191.05",
    coordsAtk: "206.81,1223.84,225.46,210.94",
  },
  {
    name: "Verdes",
    info: "22-25",
    coordsDef: "-1518.56,877.44,181.79,313.63",
    coordsAtk: "-1810.43,458.82,128.27,39.29",
  },
  {
    name: "Barraguem",
    info: "",
    coordsDef: "1366.50,1147.17,113.75,305.20",
    coordsAtk: "877.43,-53.85,80.31,181.49",
  },
];

replaceAllBattleGrounds(LUGARES);
const list = listBattleGrounds();
console.log(`✅ ${list.length} lugares registrados:`);
for (const b of list) {
  const info = b.info ? ` (${b.info})` : "";
  console.log(`  - ${b.name}${info}`);
  console.log(`     def: ${b.coords_def}`);
  console.log(`     atk: ${b.coords_atk}`);
}
