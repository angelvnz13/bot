// CRUD de lugares de enfrentamiento (battle_grounds).

import db from "./index.js";
import { sanitizeName, sanitizeCoords } from "./sanitize.js";

const stmts = {
  list:        db.prepare("SELECT id, name, coords_def, coords_atk, info FROM battle_grounds ORDER BY name"),
  byId:        db.prepare("SELECT id, name, coords_def, coords_atk, info FROM battle_grounds WHERE id = ?"),
  insert:      db.prepare("INSERT INTO battle_grounds(name, coords_def, coords_atk, info) VALUES (?, ?, ?, ?)"),
  update:      db.prepare("UPDATE battle_grounds SET name = ?, coords_def = ?, coords_atk = ?, info = ? WHERE id = ?"),
  delete:      db.prepare("DELETE FROM battle_grounds WHERE id = ?"),
  deleteAll:   db.prepare("DELETE FROM battle_grounds"),
  resetSeq:    db.prepare("DELETE FROM sqlite_sequence WHERE name='battle_grounds'"),
};

export function listBattleGrounds() {
  return stmts.list.all();
}

export function getBattleGround(id) {
  return stmts.byId.get(Number(id));
}

export function createBattleGround({ name, coordsDef, coordsAtk, info = "" }) {
  const n = sanitizeName(name);
  const cd = sanitizeCoords(coordsDef);
  const ca = sanitizeCoords(coordsAtk);
  if (!cd) throw new Error("Faltan coordenadas de defensa.");
  if (!ca) throw new Error("Faltan coordenadas de ataque.");
  try {
    const r = stmts.insert.run(n, cd, ca, String(info ?? "").slice(0, 100));
    return getBattleGround(r.lastInsertRowid);
  } catch (e) {
    if (String(e.message).includes("UNIQUE")) {
      throw new Error(`Ya existe un lugar de enfrentamiento con el nombre '${n}'.`);
    }
    throw e;
  }
}

export function updateBattleGround(id, { name, coordsDef, coordsAtk, info = "" }) {
  const n = sanitizeName(name);
  const cd = sanitizeCoords(coordsDef);
  const ca = sanitizeCoords(coordsAtk);
  try {
    stmts.update.run(n, cd, ca, String(info ?? "").slice(0, 100), Number(id));
  } catch (e) {
    if (String(e.message).includes("UNIQUE")) {
      throw new Error(`Ya existe otro lugar con el nombre '${n}'.`);
    }
    throw e;
  }
  return getBattleGround(id);
}

export function deleteBattleGround(id) {
  stmts.delete.run(Number(id));
}

export function replaceAllBattleGrounds(rows) {
  const tx = db.transaction((items) => {
    stmts.deleteAll.run();
    stmts.resetSeq.run();
    for (const item of items) {
      stmts.insert.run(
        sanitizeName(item.name),
        sanitizeCoords(item.coordsDef),
        sanitizeCoords(item.coordsAtk),
        String(item.info ?? "").slice(0, 100),
      );
    }
  });
  tx(rows);
}
