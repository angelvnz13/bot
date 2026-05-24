// Persistencia de las solicitudes de /set pendientes de aprobación.

import db from "./index.js";

db.exec(`
  CREATE TABLE IF NOT EXISTS set_requests (
    id                 INTEGER PRIMARY KEY AUTOINCREMENT,
    request_message_id TEXT UNIQUE,
    guild_id           TEXT NOT NULL,
    user_id            TEXT NOT NULL,
    rank_key           TEXT NOT NULL,
    nombre             TEXT NOT NULL,
    icid               TEXT NOT NULL,
    created_at         INTEGER NOT NULL,
    status             TEXT NOT NULL DEFAULT 'pending'
  );
  CREATE INDEX IF NOT EXISTS set_requests_user_idx
    ON set_requests(user_id);
  CREATE INDEX IF NOT EXISTS set_requests_status_idx
    ON set_requests(status);
`);

const stmts = {
  insert: db.prepare(`
    INSERT INTO set_requests(guild_id, user_id, rank_key, nombre, icid, created_at, status)
    VALUES (?, ?, ?, ?, ?, ?, 'pending')
  `),
  attachMessage: db.prepare(
    "UPDATE set_requests SET request_message_id = ? WHERE id = ?"
  ),
  byMessageId: db.prepare(
    "SELECT * FROM set_requests WHERE request_message_id = ?"
  ),
  setStatus: db.prepare(
    "UPDATE set_requests SET status = ? WHERE id = ?"
  ),
  deleteByUser: db.prepare("DELETE FROM set_requests WHERE user_id = ?"),
};

export function createSetRequest({ guildId, userId, rankKey, nombre, icid }) {
  const r = stmts.insert.run(
    String(guildId),
    String(userId),
    String(rankKey),
    String(nombre),
    String(icid),
    Date.now(),
  );
  return Number(r.lastInsertRowid);
}

export function attachRequestMessage(id, messageId) {
  stmts.attachMessage.run(String(messageId), Number(id));
}

export function getSetRequestByMessage(messageId) {
  return stmts.byMessageId.get(String(messageId));
}

export function setRequestStatus(id, status) {
  stmts.setStatus.run(String(status), Number(id));
}

export function deleteSetRequestsByUser(userId) {
  return stmts.deleteByUser.run(String(userId)).changes;
}
