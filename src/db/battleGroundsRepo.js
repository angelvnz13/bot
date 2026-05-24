// CRUD de lugares de enfrentamiento (battle_grounds).

import { pool, query } from "./pool.js";
import { sanitizeName, sanitizeCoords } from "./sanitize.js";

export async function listBattleGrounds() {
  const { rows } = await query(
    "SELECT id, name, coords_def, coords_atk, info FROM battle_grounds ORDER BY name",
  );
  return rows;
}

export async function getBattleGround(id) {
  const { rows } = await query(
    "SELECT id, name, coords_def, coords_atk, info FROM battle_grounds WHERE id = $1",
    [Number(id)],
  );
  return rows[0];
}

export async function createBattleGround({ name, coordsDef, coordsAtk, info = "" }) {
  const n = sanitizeName(name);
  const cd = sanitizeCoords(coordsDef);
  const ca = sanitizeCoords(coordsAtk);
  if (!cd) throw new Error("Faltan coordenadas de defensa.");
  if (!ca) throw new Error("Faltan coordenadas de ataque.");
  try {
    const { rows } = await query(
      "INSERT INTO battle_grounds(name, coords_def, coords_atk, info) VALUES ($1, $2, $3, $4) RETURNING id, name, coords_def, coords_atk, info",
      [n, cd, ca, String(info ?? "").slice(0, 100)],
    );
    return rows[0];
  } catch (e) {
    if (String(e.message).match(/duplicate|unique/i)) {
      throw new Error(`Ya existe un lugar de enfrentamiento con el nombre '${n}'.`);
    }
    throw e;
  }
}

export async function updateBattleGround(id, { name, coordsDef, coordsAtk, info = "" }) {
  const n = sanitizeName(name);
  const cd = sanitizeCoords(coordsDef);
  const ca = sanitizeCoords(coordsAtk);
  try {
    await query(
      "UPDATE battle_grounds SET name = $1, coords_def = $2, coords_atk = $3, info = $4 WHERE id = $5",
      [n, cd, ca, String(info ?? "").slice(0, 100), Number(id)],
    );
  } catch (e) {
    if (String(e.message).match(/duplicate|unique/i)) {
      throw new Error(`Ya existe otro lugar con el nombre '${n}'.`);
    }
    throw e;
  }
  return getBattleGround(id);
}

export async function deleteBattleGround(id) {
  await query("DELETE FROM battle_grounds WHERE id = $1", [Number(id)]);
}

export async function replaceAllBattleGrounds(rows) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM battle_grounds");
    await client.query("ALTER SEQUENCE battle_grounds_id_seq RESTART WITH 1");
    for (const item of rows) {
      await client.query(
        "INSERT INTO battle_grounds(name, coords_def, coords_atk, info) VALUES ($1, $2, $3, $4)",
        [
          sanitizeName(item.name),
          sanitizeCoords(item.coordsDef),
          sanitizeCoords(item.coordsAtk),
          String(item.info ?? "").slice(0, 100),
        ],
      );
    }
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}
