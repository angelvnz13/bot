// Reconstruir event_log escaneando el canal de registro al arrancar.
// Railway borra data.db en cada reinicio. Esta función lee los mensajes
// del canal de registro y re-inserta los eventos en event_log.

import db from "./db/index.js";
import { logEvent } from "./db.js";
import { ASALTO_REGISTRO_CHANNEL } from "./config.js";
import { logger } from "./logger.js";

// ── Parser ──────────────────────────────────────────────────────────────

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

// Detectar resultado tipo "2-0", "2 - 1", "0-2", "BANZAS2-0" (1-2 dígitos)
// Usa lookbehind/lookahead para NO confundir con IDs de Discord (5-6 dígitos).
function hasScore(content) {
  return /(?<!\d)\d{1,2}\s*-\s*\d{1,2}(?!\d)/.test(content);
}

// Detectar si el mensaje es un registro de asalto válido.
function isRegistrationMessage(content) {
  if (!hasScore(content)) return false;
  if (extractMentions(content).length === 0) return false;

  // Excluir mensajes que son notas, no resultados
  const lower = content.toLowerCase().trim();
  if (lower.startsWith("falta "))        return false;
  if (lower.startsWith("participantes:")) return false;
  if (lower.startsWith("imagen"))         return false;

  return true;
}

// ── Scanner ─────────────────────────────────────────────────────────────

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
    let skipped = 0;

    // Fetch en lotes de 100 (Discord limita a 100 por request)
    let lastId = null;
    const MAX_BATCHES = 10; // máx 1000 mensajes

    for (let batch = 0; batch < MAX_BATCHES; batch++) {
      const options = { limit: 100 };
      if (lastId) options.before = lastId;

      const messages = await channel.messages.fetch(options).catch(() => null);
      if (!messages || messages.size === 0) break;

      for (const [, msg] of messages) {
        if (!isRegistrationMessage(msg.content)) {
          skipped++;
          continue;
        }

        const userIds = extractMentions(msg.content);
        if (userIds.length === 0) {
          skipped++;
          continue;
        }

        // Usar el timestamp del mensaje para preservar fechas reales
        logEvent({
          guildId,
          userIds,
          eventType: "asalto",
          createdAt: msg.createdTimestamp,
        });
        parsed++;
      }

      lastId = messages.last()?.id;
      if (messages.size < 100) break;
    }

    logger.info("restoreEvents.done", {
      guildId,
      deletedOld: deleted,
      parsed,
      skipped,
    });
  }
}
