// Reconstruir event_log contando menciones del canal de registro.
// Si el canal específico no es accesible, escanea todos los canales de texto.
// Cada <@id> en cada mensaje = 1 evento para ese usuario.

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

// Escanear un solo canal y contar menciones
async function scanChannel(channel, guildId) {
  let total = 0;
  let lastId = null;

  while (true) {
    const options = { limit: 100 };
    if (lastId) options.before = lastId;

    const messages = await channel.messages.fetch(options).catch(() => null);
    if (!messages || messages.size === 0) break;

    for (const [, msg] of messages) {
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
  }

  return total;
}

/**
 * Reconstruir event_log desde el canal de registro.
 * Si el canal no es accesible, escanea todos los canales de texto.
 */
export async function restoreEventsFromChannel(client) {
  const guilds = client.guilds.cache;

  for (const [, guild] of guilds) {
    const guildId = guild.id;

    logger.info("restoreEvents.start", { guildId });

    // Borrar entries anteriores
    const deleted = db.prepare("DELETE FROM event_log WHERE guild_id = ?")
      .run(String(guildId)).changes;

    // Intentar el canal específico primero
    let channel = guild.channels.cache.get(ASALTO_REGISTRO_CHANNEL)
      ?? await guild.channels.fetch(ASALTO_REGISTRO_CHANNEL).catch(() => null);

    let total = 0;

    if (channel?.isTextBased?.()) {
      // Canal específico accesible
      total = await scanChannel(channel, guildId);
      logger.info("restoreEvents.specificChannel", { channel: channel.name, messages: total });
    } else {
      // Fallback: escanear todos los canales de texto
      logger.info("restoreEvents.fallback", { msg: "canal especifico no accesible, escaneando todos" });

      const channels = guild.channels.cache.filter(
        (ch) => ch.isTextBased?.() && !ch.isThread(),
      );

      for (const [, ch] of channels) {
        const n = await scanChannel(ch, guildId);
        if (n > 0) {
          logger.info("restoreEvents.channel", { channel: ch.name, messages: n });
        }
        total += n;
      }
    }

    logger.info("restoreEvents.done", { guildId, deletedOld: deleted, totalMessages: total });
  }
}
