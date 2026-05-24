// Cierre del asalto: log + borrar canal privado + registrar en /ranking.

import { logEvent } from "../../db.js";
import { getGuildConfig } from "../../guildConfig.js";
import { deleteAsalto } from "../../state.js";
import { audit } from "../../audit.js";
import { logger } from "../../logger.js";

import { buildResumenEmbed } from "./embeds.js";

export async function cerrarAsalto(interaction, state, { cancelado, ganador }) {
  const guild = interaction.guild;
  if (!guild) return;

  const cfg = await getGuildConfig(guild.id);
  const log = guild.channels.cache.get(cfg.logChannelId)
    ?? await guild.channels.fetch(cfg.logChannelId).catch(() => null);
  if (log && log.isTextBased()) {
    await log.send({
      embeds: [buildResumenEmbed(state, { cancelado, ganador })],
      allowedMentions: { parse: [] },
    }).catch((err) => logger.warn("asalto.log.failed", { err: err.message }));
  }

  if (state.privateChannelId) {
    const canal = guild.channels.cache.get(state.privateChannelId)
      ?? await guild.channels.fetch(state.privateChannelId).catch(() => null);
    if (canal) {
      setTimeout(() => {
        canal.delete("Asalto finalizado").catch((err) =>
          logger.warn("asalto.channel.deleteFailed", { err: err.message }),
        );
      }, 5000);
    }
  }

  audit("asalto.end", {
    userId: interaction.user.id,
    guildId: guild.id,
    panelMessageId: state.panelMessageId,
    cancelado,
    ganador,
    score: state.score,
  });

  if (!cancelado) {
    const participantes = [state.ownerId, ...(state.staffIds || [])];
    await logEvent({
      guildId: guild.id,
      userIds: participantes,
      eventType: "asalto",
    });
  }

  if (state.panelMessageId) deleteAsalto(state.panelMessageId);
}
