// Persistencia de asaltos activos (sobreviven a reinicios del bot).

import { query } from "./pool.js";

export async function persistAsalto(state) {
  if (!state.panelMessageId) return;
  const json = JSON.stringify(state, (k, v) => (k === "prepTimeout" ? undefined : v));
  await query(
    `INSERT INTO asaltos_activos(panel_message_id, guild_id, private_channel_id, state_json, updated_at)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT(panel_message_id) DO UPDATE SET
       private_channel_id = EXCLUDED.private_channel_id,
       state_json         = EXCLUDED.state_json,
       updated_at         = EXCLUDED.updated_at`,
    [state.panelMessageId, state.guildId, state.privateChannelId, json, Date.now()],
  );
}

export async function loadActiveAsaltos() {
  const { rows } = await query("SELECT * FROM asaltos_activos");
  return rows.map((row) => ({
    panelMessageId: row.panel_message_id,
    guildId: row.guild_id,
    privateChannelId: row.private_channel_id,
    state: JSON.parse(row.state_json),
  }));
}

export async function deleteAsaltoRow(panelMessageId) {
  await query("DELETE FROM asaltos_activos WHERE panel_message_id = $1", [
    panelMessageId,
  ]);
}
