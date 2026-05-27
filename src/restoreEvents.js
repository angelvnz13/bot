// Reconstruir event_log contando menciones del canal de registro.
// Cada <@id> en cada mensaje = 1 evento para ese usuario.
// Sin parsear resultados — simplemente contar quién aparece.

import db from "./db/index.js";
import { logEvent } from "./db.js";
import { ASALTO_REGISTRO_CHANNEL } from "./config.js";
import { logger } from "./logger.js";

// Extraer IDs de menciones <@id> o <@!id>
function extractMentions(content) {
  const ids = [];
  const regex = /<@!?(\d+)>/g;
  let m;
  while ((m = regex.exec(content)) !== null) {
    ids.push(m[1]);
  }
  return [...new Set(ids)];
}

/**
 * Reconstruir event_log desde el canal de registro.
 * Cada mención en cada mensaje = 1 evento para ese usuario.
 */
export async function restoreEventsFromChannel(client) {
  const guilds = client.guilds.cache;

  for (const [, guild] of guilds) {
    const guildId = guild.id;

    const channel = guild.channels.cache.get(ASALTO_REGISTRO_CHANNEL)
      ?? await guild.channels.fetch(ASALTO_REGISTRO_CHANNEL).catch(() => null);

    if (!channel?.isTextBased?.()) {
      logger.warn("restoreEvents.channelNotFound", { channelId: ASALTO_REGISTRO_CHANNEL });
      continue;
    }

    logger.info("restoreEvents.start", { guildId, channel: channel.name });

    // Borrar entries anteriores
    const deleted = db.prepare("DELETE FROM event_log WHERE guild_id = ?")
      .run(String(guildId)).changes;

    let total = 0;

    // Fetch en lotes de 100
    let lastId = null;
    const MAX_BATCHES = 10; // máx 1000 mensajes

    for (let batch = 0; batch < MAX_BATCHES; batch++) {
      const options = { limit: 100 };
      if (lastId) options.before = lastId;

      const messages = await channel.messages.fetch(options).catch(() => null);
      if (!messages || messages.size === 0) break;

      for (const [, msg] of messages) {
        if (msg.author.bot) continue; // ignorar mensajes del bot
        const userIds = extractMentions(msg.content);
        if (userIds.length === 0) continue;

        logEvent({
          guildId,
          userIds,
          eventType: "asalto",
          createdAt: msg.createdTimestamp,
        });
        total++;
      }

      lastId = messages.last()?.id;
      if (messages.size < 100) break;
    }

    logger.info("restoreEvents.done", { guildId, deletedOld: deleted, messagesProcessed: total });
  }
}
