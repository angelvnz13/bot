// Configuración por servidor (rol admin, categoría de asaltos, canal de logs).
// Persistida en SQLite y cacheada en memoria.

import db from "./db.js";
import { TTLCache } from "./cache.js";
import { ASALTO_CATEGORY_ID, ASALTO_LOG_CHANNEL } from "./config.js";

db.exec(`
  CREATE TABLE IF NOT EXISTS guild_config (
    guild_id        TEXT PRIMARY KEY,
    admin_role_id   TEXT,
    category_id     TEXT,
    log_channel_id  TEXT,
    updated_at      INTEGER NOT NULL
  );
`);

const stmts = {
  get: db.prepare("SELECT * FROM guild_config WHERE guild_id = ?"),
  upsert: db.prepare(`
    INSERT INTO guild_config(guild_id, admin_role_id, category_id, log_channel_id, updated_at)
    VALUES (@guild_id, @admin_role_id, @category_id, @log_channel_id, @updated_at)
    ON CONFLICT(guild_id) DO UPDATE SET
      admin_role_id  = COALESCE(excluded.admin_role_id,  guild_config.admin_role_id),
      category_id    = COALESCE(excluded.category_id,    guild_config.category_id),
      log_channel_id = COALESCE(excluded.log_channel_id, guild_config.log_channel_id),
      updated_at     = excluded.updated_at
  `),
};

const cache = new TTLCache(60 * 1000);

export function getGuildConfig(guildId) {
  const cached = cache.get(guildId);
  if (cached) return cached;
  const row = stmts.get.get(guildId);
  const cfg = {
    guildId,
    adminRoleId:  row?.admin_role_id ?? null,
    categoryId:   row?.category_id ?? ASALTO_CATEGORY_ID,
    logChannelId: row?.log_channel_id ?? ASALTO_LOG_CHANNEL,
  };
  cache.set(guildId, cfg);
  return cfg;
}

export function setGuildConfig(guildId, patch) {
  stmts.upsert.run({
    guild_id: guildId,
    admin_role_id:  patch.adminRoleId  ?? null,
    category_id:    patch.categoryId   ?? null,
    log_channel_id: patch.logChannelId ?? null,
    updated_at: Date.now(),
  });
  cache.delete(guildId);
  return getGuildConfig(guildId);
}
