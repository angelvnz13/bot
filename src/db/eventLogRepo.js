// Registro de eventos finalizados (alimenta /ranking).

import db from "./index.js";
import { events } from "../events.js";

const stmts = {
  insert: db.prepare(`
    INSERT INTO event_log(guild_id, user_id, event_type, created_at)
    VALUES (?, ?, ?, ?)
  `),
  ranking: db.prepare(`
    SELECT
      user_id,
      SUM(CASE WHEN event_type = 'asalto' THEN 1 ELSE 0 END) AS asalto,
      SUM(CASE WHEN event_type = 'rey'    THEN 1 ELSE 0 END) AS rey,
      SUM(CASE WHEN event_type = 'battle' THEN 1 ELSE 0 END) AS battle,
      COUNT(*) AS total
    FROM event_log
    WHERE guild_id = ?
    GROUP BY user_id
    ORDER BY total DESC, user_id ASC
    LIMIT ?
  `),
  rankingRange: db.prepare(`
    SELECT
      user_id,
      SUM(CASE WHEN event_type = 'asalto' THEN 1 ELSE 0 END) AS asalto,
      SUM(CASE WHEN event_type = 'rey'    THEN 1 ELSE 0 END) AS rey,
      SUM(CASE WHEN event_type = 'battle' THEN 1 ELSE 0 END) AS battle,
      COUNT(*) AS total
    FROM event_log
    WHERE guild_id = ? AND created_at >= ?
    GROUP BY user_id
    ORDER BY total DESC, user_id ASC
    LIMIT ?
  `),
  totalByGuild: db.prepare("SELECT COUNT(*) AS n FROM event_log WHERE guild_id = ?"),
  deleteByUser: db.prepare("DELETE FROM event_log WHERE user_id = ?"),
};

export function logEvent({ guildId, userIds, eventType, createdAt }) {
  if (!guildId || !eventType) return;
  const ids = Array.isArray(userIds) ? userIds : [userIds];
  const unique = [...new Set(ids.filter(Boolean).map(String))];
  if (!unique.length) return;
  const ts = createdAt ?? Date.now();
  const tx = db.transaction(() => {
    for (const uid of unique) {
      stmts.insert.run(String(guildId), uid, String(eventType), ts);
    }
  });
  tx();
  events.emit("event:logged", { guildId: String(guildId), eventType: String(eventType) });
}

export function getRanking(guildId, limit = 10) {
  return stmts.ranking.all(String(guildId), limit);
}

export function getRankingSince(guildId, sinceMs, limit = 10) {
  return stmts.rankingRange.all(String(guildId), Number(sinceMs), limit);
}

export function totalEventsForGuild(guildId) {
  return stmts.totalByGuild.get(String(guildId)).n;
}

export function deleteEventsForUser(userId) {
  return stmts.deleteByUser.run(String(userId)).changes;
}

// Borrar eventos de un usuario en un rango de tiempo (±60s del timestamp)
export function deleteEventsForUserAt(guildId, userId, createdAt) {
  return db.prepare(`
    DELETE FROM event_log
    WHERE guild_id = ? AND user_id = ? AND event_type = 'asalto'
      AND created_at BETWEEN ? AND ?
  `).run(
    String(guildId),
    String(userId),
    createdAt - 60000,
    createdAt + 60000,
  ).changes;
}
