// Persistencia de los paneles de /ranking publicados en cada servidor.

import db from "./index.js";

const stmts = {
  insert: db.prepare(`
    INSERT OR REPLACE INTO ranking_panels(channel_id, message_id, guild_id, view)
    VALUES (?, ?, ?, ?)
  `),
  setView: db.prepare(
    "UPDATE ranking_panels SET view = ? WHERE channel_id = ? AND message_id = ?"
  ),
  get: db.prepare(
    "SELECT channel_id, message_id, guild_id, view FROM ranking_panels WHERE channel_id = ? AND message_id = ?"
  ),
  delete: db.prepare(
    "DELETE FROM ranking_panels WHERE channel_id = ? AND message_id = ?"
  ),
  forGuild: db.prepare(
    "SELECT channel_id, message_id, guild_id, view FROM ranking_panels WHERE guild_id = ?"
  ),
};

export function registerRankingPanel({ channelId, messageId, guildId, view = "total" }) {
  stmts.insert.run(String(channelId), String(messageId), String(guildId), String(view));
}

export function setRankingPanelView({ channelId, messageId, view }) {
  stmts.setView.run(String(view), String(channelId), String(messageId));
}

export function getRankingPanel({ channelId, messageId }) {
  return stmts.get.get(String(channelId), String(messageId));
}

export function unregisterRankingPanel({ channelId, messageId }) {
  stmts.delete.run(String(channelId), String(messageId));
}

export function listRankingPanels(guildId) {
  return stmts.forGuild.all(String(guildId));
}
