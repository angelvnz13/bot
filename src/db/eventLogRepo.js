// Registro de eventos finalizados (alimenta /ranking).

import { pool, query } from "./pool.js";
import { events } from "../events.js";

export async function logEvent({ guildId, userIds, eventType }) {
  if (!guildId || !eventType) return;
  const ids = Array.isArray(userIds) ? userIds : [userIds];
  const unique = [...new Set(ids.filter(Boolean).map(String))];
  if (!unique.length) return;
  const now = Date.now();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const uid of unique) {
      await client.query(
        "INSERT INTO event_log(guild_id, user_id, event_type, created_at) VALUES ($1, $2, $3, $4)",
        [String(guildId), uid, String(eventType), now],
      );
    }
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    client.release();
  }
  events.emit("event:logged", { guildId: String(guildId), eventType: String(eventType) });
}

export async function getRanking(guildId, limit = 10) {
  const { rows } = await query(
    `SELECT
       user_id,
       SUM(CASE WHEN event_type = 'asalto' THEN 1 ELSE 0 END)::int AS asalto,
       SUM(CASE WHEN event_type = 'rey'    THEN 1 ELSE 0 END)::int AS rey,
       SUM(CASE WHEN event_type = 'battle' THEN 1 ELSE 0 END)::int AS battle,
       COUNT(*)::int AS total
     FROM event_log
     WHERE guild_id = $1
     GROUP BY user_id
     ORDER BY total DESC, user_id ASC
     LIMIT $2`,
    [String(guildId), limit],
  );
  return rows;
}

export async function getRankingSince(guildId, sinceMs, limit = 10) {
  const { rows } = await query(
    `SELECT
       user_id,
       SUM(CASE WHEN event_type = 'asalto' THEN 1 ELSE 0 END)::int AS asalto,
       SUM(CASE WHEN event_type = 'rey'    THEN 1 ELSE 0 END)::int AS rey,
       SUM(CASE WHEN event_type = 'battle' THEN 1 ELSE 0 END)::int AS battle,
       COUNT(*)::int AS total
     FROM event_log
     WHERE guild_id = $1 AND created_at >= $2
     GROUP BY user_id
     ORDER BY total DESC, user_id ASC
     LIMIT $3`,
    [String(guildId), Number(sinceMs), limit],
  );
  return rows;
}

export async function totalEventsForGuild(guildId) {
  const { rows } = await query(
    "SELECT COUNT(*)::int AS n FROM event_log WHERE guild_id = $1",
    [String(guildId)],
  );
  return rows[0].n;
}

export async function deleteEventsForUser(userId) {
  const result = await query(
    "DELETE FROM event_log WHERE user_id = $1",
    [String(userId)],
  );
  return result.rowCount;
}
