// CRUD de sedes (clanes) + tombstones (sedes eliminadas).

import db from "./index.js";
import { sanitizeName, sanitizeCoords, sanitizeEmoji } from "./sanitize.js";
import { TTLCache } from "../cache.js";

const stmts = {
  list:        db.prepare("SELECT id, name, coords, emoji FROM sedes ORDER BY name"),
  byId:        db.prepare("SELECT id, name, coords, emoji FROM sedes WHERE id = ?"),
  insert:      db.prepare("INSERT INTO sedes(name, coords, emoji) VALUES (?, ?, ?)"),
  update:      db.prepare("UPDATE sedes SET name = ?, coords = ?, emoji = ? WHERE id = ?"),
  delete:      db.prepare("DELETE FROM sedes WHERE id = ?"),
  count:       db.prepare("SELECT COUNT(*) AS n FROM sedes"),
  deleteAll:   db.prepare("DELETE FROM sedes"),
  resetSeq:    db.prepare("DELETE FROM sqlite_sequence WHERE name='sedes'"),

  tombstoneInsert: db.prepare(`
    INSERT INTO sedes_eliminadas(name, deleted_at) VALUES (?, ?)
    ON CONFLICT(name) DO UPDATE SET deleted_at = excluded.deleted_at
  `),
  tombstoneDelete: db.prepare("DELETE FROM sedes_eliminadas WHERE name = ?"),
  tombstoneList:   db.prepare("SELECT name FROM sedes_eliminadas"),

  asaltoDeleteByName: db.prepare(
    "DELETE FROM asaltos_activos WHERE state_json LIKE '%\"name\":\"' || @name || '\"%'"
  ),
};

const sedesCache = new TTLCache(30 * 1000);
const SEDES_KEY = "all";

function invalidateSedes() {
  sedesCache.delete(SEDES_KEY);
}

export function listSedes() {
  const cached = sedesCache.get(SEDES_KEY);
  if (cached) return cached;
  const rows = stmts.list.all();
  sedesCache.set(SEDES_KEY, rows);
  return rows;
}

export function getSede(id) {
  return stmts.byId.get(Number(id));
}

export function createSede(name, coords = "", emoji = "") {
  const n = sanitizeName(name);
  const c = sanitizeCoords(coords);
  const e = sanitizeEmoji(emoji);
  try {
    const info = stmts.insert.run(n, c, e);
    stmts.tombstoneDelete.run(n);
    invalidateSedes();
    return { id: info.lastInsertRowid, name: n, coords: c, emoji: e };
  } catch (err) {
    if (String(err.message).includes("UNIQUE")) {
      throw new Error(`Ya existe una sede con el nombre '${n}'.`);
    }
    throw err;
  }
}

export function updateSede(id, name, coords, emoji = "") {
  const n = sanitizeName(name);
  const c = sanitizeCoords(coords);
  const e = sanitizeEmoji(emoji);
  try {
    stmts.update.run(n, c, e, Number(id));
    invalidateSedes();
  } catch (err) {
    if (String(err.message).includes("UNIQUE")) {
      throw new Error(`Ya existe otra sede con el nombre '${n}'.`);
    }
    throw err;
  }
  return getSede(id);
}

export function deleteSede(id) {
  const sede = getSede(id);
  if (!sede) return null;

  const tx = db.transaction(() => {
    stmts.delete.run(Number(id));
    stmts.tombstoneInsert.run(sede.name, Date.now());
    stmts.asaltoDeleteByName.run({ name: sede.name });
  });
  tx();

  invalidateSedes();
  return sede;
}

export function listTombstones() {
  return stmts.tombstoneList.all().map((r) => r.name);
}

export function clearTombstone(name) {
  stmts.tombstoneDelete.run(name);
}

export function countSedes() {
  return stmts.count.get().n;
}

export function replaceAllSedes(rows) {
  const tx = db.transaction((items) => {
    stmts.deleteAll.run();
    stmts.resetSeq.run();
    for (const row of items) {
      const [name, coords, emoji = ""] = row;
      const sanitized = sanitizeName(name);
      stmts.insert.run(sanitized, sanitizeCoords(coords), sanitizeEmoji(emoji));
      stmts.tombstoneDelete.run(sanitized);
    }
  });
  tx(rows);
  invalidateSedes();
}
