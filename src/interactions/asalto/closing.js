// Cierre del asalto: log + borrar canal privado + registrar en /ranking.

import { logEvent } from "../../db.js";
import { getGuildConfig } from "../../guildConfig.js";
import { deleteAsalto } from "../../state.js";
import { audit } from "../../audit.js";
import { logger } from "../../logger.js";
import { ASALTO_REGISTRO_CHANNEL } from "../../config.js";

import { buildResumenEmbed } from "./embeds.js";

function fechaCorta() {
  // Formato: DD/MM/AA en hora local del servidor.
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(-2);
  return `${dd}/${mm}/${yy}`;
}

function buildRegistroPlantilla(state, { cancelado, ganador }) {
  if (cancelado) {
    // No publicamos plantilla de eventos cancelados.
    return null;
  }
  const atkScore = state.score?.[state.sedeAtk?.name] ?? 0;
  const defScore = state.score?.[state.sedeDef?.name] ?? 0;
  // El ganador va siempre primero en el formato "GanadorScore - PerdedorScore".
  const winner = ganador === state.sedeAtk?.name ? state.sedeAtk : state.sedeDef;
  const loser  = ganador === state.sedeAtk?.name ? state.sedeDef : state.sedeAtk;
  const winScore  = ganador === state.sedeAtk?.name ? atkScore : defScore;
  const loseScore = ganador === state.sedeAtk?.name ? defScore : atkScore;

  const leones = (state.staffIds || []).map((id) => `<@${id}>`).join(" ");

  return [
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
    `🗓️ ${fechaCorta()}`,
    `🏰 ${winner?.name ?? "?"} ${winScore}-${loseScore} ${loser?.name ?? "?"}`,
    `🦁 ${leones || "_sin staff_"}`,
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
  ].join("\n");
}

export async function cerrarAsalto(interaction, state, { cancelado, ganador }) {
  // Guard: si ya se cerró antes, no hacemos nada (evita duplicar registros y
  // publicaciones cuando se pulsa Finalizar/Cancelar varias veces).
  if (state.closed) return;
  state.closed = true;

  const guild = interaction.guild;
  if (!guild) return;

  const cfg = getGuildConfig(guild.id);

  // Resumen detallado en el canal de logs configurable
  const log = guild.channels.cache.get(cfg.logChannelId)
    ?? await guild.channels.fetch(cfg.logChannelId).catch(() => null);
  if (log && log.isTextBased()) {
    await log.send({
      embeds: [buildResumenEmbed(state, { cancelado, ganador })],
      allowedMentions: { parse: [] },
    }).catch((err) => logger.warn("asalto.log.failed", { err: err.message }));
  }

  // Plantilla corta de registro en el canal fijo (solo si no se canceló)
  const plantilla = buildRegistroPlantilla(state, { cancelado, ganador });
  if (plantilla) {
    const registro = guild.channels.cache.get(ASALTO_REGISTRO_CHANNEL)
      ?? await guild.channels.fetch(ASALTO_REGISTRO_CHANNEL).catch(() => null);
    if (registro && registro.isTextBased()) {
      await registro.send({
        content: plantilla,
        allowedMentions: { users: state.staffIds || [], roles: [], parse: [] },
      }).catch((err) => logger.warn("asalto.registro.failed", { err: err.message }));
    }
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
    logEvent({
      guildId: guild.id,
      userIds: participantes,
      eventType: "asalto",
    });
  }

  if (state.panelMessageId) deleteAsalto(state.panelMessageId);
}
