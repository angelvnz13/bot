// Persistencia de asaltos activos (para sobrevivir a reinicios del bot).

import db from "./index.js";

const stmts = {
  upsert: db.prepare(`
    INSERT INTO asaltos_activos(panel_message_id, guild_id, private_channel_id, state_json, updated_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(panel_message_id) DO UPDATE SET
      private_channel_id = excluded.private_channel_id,
      state_json         = excluded.state_json,
      updated_at         = excluded.updated_at
  `),
  list:   db.prepare("SELECT * FROM asaltos_activos"),
  delete: db.prepare("DELETE FROM asaltos_activos WHERE panel_message_id = ?"),
};

export function persistAsalto(state) {
  if (!state.panelMessageId) return;
  stmts.upsert.run(
    state.panelMessageId,
    state.guildId,
    state.privateChannelId,
    JSON.stringify(state, (k, v) => (k === "prepTimeout" ? undefined : v)),
    Date.now(),
  );
}

export function loadActiveAsaltos() {
  return stmts.list.all().map((row) => ({
    panelMessageId: row.panel_message_id,
    guildId: row.guild_id,
    privateChannelId: row.private_channel_id,
    state: JSON.parse(row.state_json),
  }));
}

export function deleteAsaltoRow(panelMessageId) {
  stmts.delete.run(panelMessageId);
}
