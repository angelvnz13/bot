// Configuración por servidor (guild_config).

import { query } from "./pool.js";

export async function getGuildConfigRow(guildId) {
  const { rows } = await query(
    "SELECT guild_id, admin_role_id, category_id, log_channel_id FROM guild_config WHERE guild_id = $1",
    [String(guildId)],
  );
  return rows[0] ?? null;
}

export async function upsertGuildConfig({ guildId, adminRoleId, categoryId, logChannelId }) {
  await query(
    `INSERT INTO guild_config(guild_id, admin_role_id, category_id, log_channel_id, updated_at)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT(guild_id) DO UPDATE SET
       admin_role_id  = COALESCE(EXCLUDED.admin_role_id,  guild_config.admin_role_id),
       category_id    = COALESCE(EXCLUDED.category_id,    guild_config.category_id),
       log_channel_id = COALESCE(EXCLUDED.log_channel_id, guild_config.log_channel_id),
       updated_at     = EXCLUDED.updated_at`,
    [String(guildId), adminRoleId ?? null, categoryId ?? null, logChannelId ?? null, Date.now()],
  );
}
