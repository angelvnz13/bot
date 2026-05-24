// Si la DB está vacía al arrancar, sembramos las sedes y lugares por defecto.
// Así el repo no necesita committear data.db.

import {
  countSedes,
  listBattleGrounds,
  replaceAllBattleGrounds,
} from "./db.js";
import { createSede } from "./db/sedesRepo.js";
import { logger } from "./logger.js";

const SEDES_DEFAULT = [
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

const LUGARES_DEFAULT = [
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

export function seedDefaultsIfEmpty() {
  if (countSedes() === 0) {
    let added = 0;
    for (const [name, coords, emoji] of SEDES_DEFAULT) {
      try {
        createSede(name, coords, emoji);
        added += 1;
      } catch (e) {
        // ignoramos errores individuales (p. ej. UNIQUE si ya existía por carrera)
      }
    }
    logger.info("seed.sedes", { added });
  }

  if (listBattleGrounds().length === 0) {
    replaceAllBattleGrounds(LUGARES_DEFAULT);
    logger.info("seed.lugares", { added: LUGARES_DEFAULT.length });
  }
}
