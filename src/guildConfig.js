// Configuración por servidor: rol admin, categoría de asaltos, canal de logs.
// Se persiste en Postgres (vía guildConfigRepo) y se cachea en memoria.

import { TTLCache } from "./cache.js";
import { ASALTO_CATEGORY_ID, ASALTO_LOG_CHANNEL } from "./config.js";
import { getGuildConfigRow, upsertGuildConfig } from "./db.js";

const cache = new TTLCache(60 * 1000);

export async function getGuildConfig(guildId) {
  const cached = cache.get(guildId);
  if (cached) return cached;
  const row = await getGuildConfigRow(guildId);
  const cfg = {
    guildId,
    adminRoleId:  row?.admin_role_id ?? null,
    categoryId:   row?.category_id ?? ASALTO_CATEGORY_ID,
    logChannelId: row?.log_channel_id ?? ASALTO_LOG_CHANNEL,
  };
  cache.set(guildId, cfg);
  return cfg;
}

export async function setGuildConfig(guildId, patch) {
  await upsertGuildConfig({
    guildId,
    adminRoleId: patch.adminRoleId,
    categoryId: patch.categoryId,
    logChannelId: patch.logChannelId,
  });
  cache.delete(guildId);
  return getGuildConfig(guildId);
}
