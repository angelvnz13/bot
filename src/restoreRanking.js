// Auto-descubrir paneles de ranking existentes al arrancarRailway borra
// data.db en cada reinicio. Esta función busca en los canales del servidor
// los mensajes del bot que contengan un embed con título "🏆 Ranking de
// eventos" y los re-registra en la DB para que el auto-refresh funcione.

import { registerRankingPanel, listRankingPanels } from "./db.js";
import { logger } from "./logger.js";

/**
 * Escanea los canales de texto de un guild buscando mensajes del bot
 * con embeds de ranking. Re-registra cada uno encontrado.
 */
export async function discoverRankingPanels(client) {
  const guilds = client.guilds.cache;
  let total = 0;

  for (const [, guild] of guilds) {
    // Evitar duplicar: paneles ya registrados
    const existing = new Set(
      listRankingPanels(guild.id).map((p) => p.message_id),
    );

    // Buscar en canales de texto visibles para el bot
    const channels = guild.channels.cache.filter(
      (ch) => ch.isTextBased?.() && !ch.isThread(),
    );

    for (const [, channel] of channels) {
      try {
        // Buscar mensajes recientes del bot (últimas 100 mensajes)
        const messages = await channel.messages.fetch({ limit: 100 }).catch(() => null);
        if (!messages) continue;

        for (const [, msg] of messages) {
          // Solo mensajes del bot
          if (msg.author.id !== client.user.id) continue;
          // Ya registrado
          if (existing.has(msg.id)) continue;

          // Verificar que tenga un embed con título de ranking
          const hasRanking = msg.embeds?.some(
            (e) => e.title?.includes("Ranking de eventos"),
          );
          if (!hasRanking) continue;

          // Detectar la vista actual (total/weekly/monthly) de los botones
          const view = detectPanelView(msg);

          registerRankingPanel({
            channelId: msg.channelId,
            messageId: msg.id,
            guildId: guild.id,
            view,
          });
          existing.add(msg.id);
          total++;
          logger.info("ranking.panel.discovered", {
            channel: channel.name,
            msgId: msg.id,
            view,
          });
        }
      } catch (err) {
        // Ignorar canales inaccesibles (sin permisos, etc.)
      }
    }
  }

  if (total > 0) {
    logger.info("ranking.discovery.done", { panelsFound: total });
  }
  return total;
}

/**
 * Detectar la vista activa de un panel leyendo los customIds de sus botones.
 */
function detectPanelView(msg) {
  const rows = msg.components || [];
  for (const row of rows) {
    for (const comp of row.components || []) {
      if (comp.type === 2 && comp.customId?.startsWith("ranking:view:")) {
        return comp.customId.split(":")[2];
      }
    }
  }
  return "total";
}
