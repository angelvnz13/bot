// Persistencia de los paneles de /ranking publicados.

import { query } from "./pool.js";

export async function registerRankingPanel({ channelId, messageId, guildId, view = "total" }) {
  await query(
    `INSERT INTO ranking_panels(channel_id, message_id, guild_id, view)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT(channel_id, message_id) DO UPDATE SET
       guild_id = EXCLUDED.guild_id,
       view     = EXCLUDED.view`,
    [String(channelId), String(messageId), String(guildId), String(view)],
  );
}

export async function setRankingPanelView({ channelId, messageId, view }) {
  await query(
    "UPDATE ranking_panels SET view = $1 WHERE channel_id = $2 AND message_id = $3",
    [String(view), String(channelId), String(messageId)],
  );
}

export async function getRankingPanel({ channelId, messageId }) {
  const { rows } = await query(
    "SELECT channel_id, message_id, guild_id, view FROM ranking_panels WHERE channel_id = $1 AND message_id = $2",
    [String(channelId), String(messageId)],
  );
  return rows[0];
}

export async function unregisterRankingPanel({ channelId, messageId }) {
  await query(
    "DELETE FROM ranking_panels WHERE channel_id = $1 AND message_id = $2",
    [String(channelId), String(messageId)],
  );
}

export async function listRankingPanels(guildId) {
  const { rows } = await query(
    "SELECT channel_id, message_id, guild_id, view FROM ranking_panels WHERE guild_id = $1",
    [String(guildId)],
  );
  return rows;
}
