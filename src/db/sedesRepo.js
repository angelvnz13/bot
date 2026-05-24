// CRUD de sedes (clanes) + tombstones.

import { pool, query } from "./pool.js";
import { sanitizeName, sanitizeCoords, sanitizeEmoji } from "./sanitize.js";
import { TTLCache } from "../cache.js";

const sedesCache = new TTLCache(30 * 1000);
const SEDES_KEY = "all";
function invalidateSedes() { sedesCache.delete(SEDES_KEY); }

export async function listSedes() {
  const cached = sedesCache.get(SEDES_KEY);
  if (cached) return cached;
  const { rows } = await query(
    "SELECT id, name, coords, emoji FROM sedes ORDER BY name",
  );
  sedesCache.set(SEDES_KEY, rows);
  return rows;
}

export async function getSede(id) {
  const { rows } = await query(
    "SELECT id, name, coords, emoji FROM sedes WHERE id = $1",
    [Number(id)],
  );
  return rows[0];
}

export async function createSede(name, coords = "", emoji = "") {
  const n = sanitizeName(name);
  const c = sanitizeCoords(coords);
  const e = sanitizeEmoji(emoji);
  try {
    const { rows } = await query(
      "INSERT INTO sedes(name, coords, emoji) VALUES ($1, $2, $3) RETURNING id, name, coords, emoji",
      [n, c, e],
    );
    await query("DELETE FROM sedes_eliminadas WHERE name = $1", [n]);
    invalidateSedes();
    return rows[0];
  } catch (err) {
    if (String(err.message).match(/duplicate|unique/i)) {
      throw new Error(`Ya existe una sede con el nombre '${n}'.`);
    }
    throw err;
  }
}

export async function updateSede(id, name, coords, emoji = "") {
  const n = sanitizeName(name);
  const c = sanitizeCoords(coords);
  const e = sanitizeEmoji(emoji);
  try {
    await query(
      "UPDATE sedes SET name = $1, coords = $2, emoji = $3 WHERE id = $4",
      [n, c, e, Number(id)],
    );
    invalidateSedes();
  } catch (err) {
    if (String(err.message).match(/duplicate|unique/i)) {
      throw new Error(`Ya existe otra sede con el nombre '${n}'.`);
    }
    throw err;
  }
  return getSede(id);
}

export async function deleteSede(id) {
  const sede = await getSede(id);
  if (!sede) return null;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM sedes WHERE id = $1", [Number(id)]);
    await client.query(
      "INSERT INTO sedes_eliminadas(name, deleted_at) VALUES ($1, $2) ON CONFLICT(name) DO UPDATE SET deleted_at = EXCLUDED.deleted_at",
      [sede.name, Date.now()],
    );
    await client.query(
      "DELETE FROM asaltos_activos WHERE state_json LIKE '%\"name\":\"' || $1 || '\"%'",
      [sede.name],
    );
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    client.release();
  }

  invalidateSedes();
  return sede;
}

export async function listTombstones() {
  const { rows } = await query("SELECT name FROM sedes_eliminadas");
  return rows.map((r) => r.name);
}

export async function clearTombstone(name) {
  await query("DELETE FROM sedes_eliminadas WHERE name = $1", [String(name)]);
}

export async function countSedes() {
  const { rows } = await query("SELECT COUNT(*)::int AS n FROM sedes");
  return rows[0].n;
}

export async function replaceAllSedes(rows) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM sedes");
    await client.query("ALTER SEQUENCE sedes_id_seq RESTART WITH 1");
    for (const row of rows) {
      const [name, coords, emoji = ""] = row;
      const n = sanitizeName(name);
      await client.query(
        "INSERT INTO sedes(name, coords, emoji) VALUES ($1, $2, $3)",
        [n, sanitizeCoords(coords), sanitizeEmoji(emoji)],
      );
      await client.query("DELETE FROM sedes_eliminadas WHERE name = $1", [n]);
    }
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    client.release();
  }
  invalidateSedes();
}
