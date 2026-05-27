// Reconstruir event_log escaneando el canal de registro al arrancar.
// Railway borra data.db en cada reinicio. Esta función lee los mensajes
// del canal de registro y re-inserta los eventos en event_log.

import db from "./db/index.js";
import { logEvent, totalEventsForGuild } from "./db.js";
import { ASALTO_REGISTRO_CHANNEL } from "./config.js";
import { logger } from "./logger.js";

// Extraer menciones <@id> de un mensaje
function extractMentions(content) {
  const ids = [];
  const regex = /<@!?(\d+)>/g;
  let m;
  while ((m = regex.exec(content)) !== null) {
    ids.push(m[1]);
  }
  return [...new Set(ids)];
}

// Verificar si un mensaje parece un registro de asalto
function isRegistrationMessage(content) {
  // Tiene menciones Y contiene un patrón de resultado (X-Y o "vs")
  const hasMentions = /<@!?\d+>/.test(content);
  const hasResult = /\d+\s*-\s*\d+/.test(content) || /vs/i.test(content);
  return hasMentions && hasResult;
}

/**
 * Reconstruir event_log desde el canal de registro.
 * Borra los entries existentes del guild y re-inserta desde los mensajes.
 * Idempotente: puede ejecutarse en cada reinicio sin peligro.
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

    // Borrar entries anteriores (el canal es la fuente de verdad)
    const deleted = db.prepare("DELETE FROM event_log WHERE guild_id = ?")
      .run(String(guildId)).changes;

    let parsed = 0;
    let inserted = 0;

    // Fetch en lotes de 100
    let lastId = null;
    const MAX_BATCHES = 5; // máx 500 mensajes

    for (let batch = 0; batch < MAX_BATCHES; batch++) {
      const options = { limit: 100 };
      if (lastId) options.before = lastId;

      const messages = await channel.messages.fetch(options).catch(() => null);
      if (!messages || messages.size === 0) break;

      for (const [, msg] of messages) {
        if (!isRegistrationMessage(msg.content)) continue;

        const userIds = extractMentions(msg.content);
        if (userIds.length === 0) continue;

        parsed++;

        // Usar el timestamp del mensaje para preservar fechas reales
        logEvent({
          guildId,
          userIds,
          eventType: "asalto",
          createdAt: msg.createdTimestamp,
        });
        inserted++;
      }

      lastId = messages.last()?.id;
      if (messages.size < 100) break;
    }

    logger.info("restoreEvents.done", {
      guildId,
      deletedOld: deleted,
      parsed,
      inserted,
    });
  }
}
