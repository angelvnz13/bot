// Cierre del Rey del Crimen: log + borrar canal privado + registrar en /ranking.

import { logEvent } from "../../db.js";
import { getGuildConfig } from "../../guildConfig.js";
import { audit } from "../../audit.js";
import { logger } from "../../logger.js";
import { isAdmin } from "../../permissions.js";

import { reyes } from "./state.js";
import { buildResumenEmbed } from "./embeds.js";

async function cerrar(interaction, panelId, { cancelado }) {
  const state = reyes.get(panelId);
  if (!state) return interaction.reply({ content: "⚠️ Este evento ya no está activo.", flags: 64 });

  if (interaction.user.id !== state.ownerId && !isAdmin(interaction.member)) {
    return interaction.reply({
      content: "🚫 Solo el creador del evento o un administrador puede cerrarlo.",
      flags: 64,
    });
  }

  const cfg = getGuildConfig(state.guildId);
  const log = interaction.client.channels.cache.get(cfg.logChannelId)
    ?? await interaction.client.channels.fetch(cfg.logChannelId).catch(() => null);
  if (log?.isTextBased?.()) {
    await log.send({
      embeds: [buildResumenEmbed(state, { cancelado })],
      allowedMentions: { parse: [] },
    }).catch((err) => logger.warn("rey.log.failed", { err: err.message }));
  }

  await interaction.update({
    embeds: [buildResumenEmbed(state, { cancelado })],
    components: [],
  });

  audit("rey.end", {
    userId: interaction.user.id,
    panelId,
    cancelado,
    leones: state.leones.map((l) => ({
      userId: l.userId,
      sedes: l.sedes.map((s) => ({ name: s.sede.name, status: s.status, razon: s.razon })),
    })),
  });

  if (!cancelado) {
    const participantes = [state.ownerId, ...state.leones.map((l) => l.userId)];
    logEvent({
      guildId: state.guildId,
      userIds: participantes,
      eventType: "rey",
    });
  }

  if (state.privateChannelId) {
    setTimeout(async () => {
      const ch = interaction.client.channels.cache.get(state.privateChannelId)
        ?? await interaction.client.channels.fetch(state.privateChannelId).catch(() => null);
      ch?.delete?.("Rey del Crimen finalizado").catch((e) =>
        logger.warn("rey.deleteChannel.failed", { err: e.message }),
      );
    }, 5000);
  }
  reyes.delete(panelId);
}

export async function endEvent(interaction, panelId)    { return cerrar(interaction, panelId, { cancelado: false }); }
export async function cancelEvent(interaction, panelId) { return cerrar(interaction, panelId, { cancelado: true });  }
