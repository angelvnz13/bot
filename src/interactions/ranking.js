// /ranking — embed persistente con 3 botones (Total / Semanal / Mensual).
// Se actualiza en tiempo real cada vez que termina un evento.

import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from "discord.js";

import {
  getRanking,
  getRankingSince,
  getRankingPanel,
  listRankingPanels,
  registerRankingPanel,
  setRankingPanelView,
  unregisterRankingPanel,
} from "../db.js";
import { events } from "../events.js";
import { logger } from "../logger.js";

const MEDALS = ["🥇", "🥈", "🥉"];
let clientRef = null;

export function attachRankingClient(client) {
  clientRef = client;
  events.on("event:logged", ({ guildId }) => {
    refreshAllPanels(guildId).catch((err) =>
      logger.warn("ranking.refresh.failed", { err: err.message }),
    );
  });
}

// ---------------------------------------------------------------------------
// Helpers de fechas
// ---------------------------------------------------------------------------
function startOfMonthMs() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0).getTime();
}

function startOfWeekMs() {
  // Lunes 00:00 como inicio de semana
  const d = new Date();
  const diaSemana = (d.getDay() + 6) % 7; // 0 = lunes
  const lunes = new Date(d.getFullYear(), d.getMonth(), d.getDate() - diaSemana, 0, 0, 0, 0);
  return lunes.getTime();
}

function nombreMes() {
  const meses = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
  ];
  const d = new Date();
  return `${meses[d.getMonth()]} ${d.getFullYear()}`;
}

function rangoSemanaActual() {
  const d = new Date();
  const diaSemana = (d.getDay() + 6) % 7;
  const lunes = new Date(d.getFullYear(), d.getMonth(), d.getDate() - diaSemana);
  const domingo = new Date(lunes.getFullYear(), lunes.getMonth(), lunes.getDate() + 6);
  const fmt = (x) => `${String(x.getDate()).padStart(2, "0")}/${String(x.getMonth() + 1).padStart(2, "0")}`;
  return `${fmt(lunes)} – ${fmt(domingo)}`;
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------
function listaLineas(rows) {
  if (!rows.length) return "_sin datos aún_";
  return rows.map((r, idx) => {
    const medal = MEDALS[idx] ?? `**${idx + 1}.**`;
    const desglose = [
      r.asalto > 0 ? `🏰 ${r.asalto}` : null,
      r.rey    > 0 ? `👑 ${r.rey}`    : null,
      r.battle > 0 ? `⚔️ ${r.battle}` : null,
    ].filter(Boolean).join(" · ");
    return `${medal} <@${r.user_id}> — **${r.total}**${desglose ? `\n   ${desglose}` : ""}`;
  }).join("\n\n");
}

function rowsForView(guildId, view) {
  switch (view) {
    case "weekly":  return getRankingSince(guildId, startOfWeekMs(), 10);
    case "monthly": return getRankingSince(guildId, startOfMonthMs(), 10);
    default:        return getRanking(guildId, 10);
  }
}

function tituloVista(view) {
  switch (view) {
    case "weekly":  return `📅 Semanal · ${rangoSemanaActual()}`;
    case "monthly": return `📅 Mensual · ${nombreMes()}`;
    default:        return "🌐 Total";
  }
}

export function buildRankingEmbed(guildId, view = "total") {
  const rows = rowsForView(guildId, view);
  return new EmbedBuilder()
    .setTitle("🏆 Ranking de eventos")
    .setColor(0xf1c40f)
    .setDescription(`**${tituloVista(view)}**\n\n${listaLineas(rows)}`);
}

function rowBotones(view) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("ranking:view:total")
      .setStyle(view === "total" ? ButtonStyle.Primary : ButtonStyle.Secondary)
      .setLabel("Total")
      .setEmoji("🌐"),
    new ButtonBuilder()
      .setCustomId("ranking:view:weekly")
      .setStyle(view === "weekly" ? ButtonStyle.Primary : ButtonStyle.Secondary)
      .setLabel("Semanal")
      .setEmoji("📅"),
    new ButtonBuilder()
      .setCustomId("ranking:view:monthly")
      .setStyle(view === "monthly" ? ButtonStyle.Primary : ButtonStyle.Secondary)
      .setLabel("Mensual")
      .setEmoji("🗓️"),
  );
}

// ---------------------------------------------------------------------------
// Comando /ranking
// ---------------------------------------------------------------------------
export async function replyRanking(interaction) {
  const guildId = interaction.guildId;
  if (!guildId) {
    return interaction.reply({ content: "❌ Solo funciona en un servidor.", flags: 64 });
  }

  try {
    await interaction.reply({
      embeds: [buildRankingEmbed(guildId, "total")],
      components: [rowBotones("total")],
      allowedMentions: { parse: [] },
    });
  } catch (err) {
    logger.error("ranking.reply.failed", { err: err.message });
    return;
  }

  try {
    const msg = await interaction.fetchReply();
    registerRankingPanel({
      channelId: msg.channelId,
      messageId: msg.id,
      guildId,
      view: "total",
    });
  } catch (err) {
    logger.warn("ranking.register.failed", { err: err.message });
  }
}

// ---------------------------------------------------------------------------
// Botones de filtro
// ---------------------------------------------------------------------------
export async function handleRankingViewButton(interaction, view) {
  const channelId = interaction.channelId;
  const messageId = interaction.message?.id;
  const guildId = interaction.guildId;
  if (!guildId || !messageId) {
    return interaction.reply({ content: "❌ No se puede actualizar este panel.", flags: 64 });
  }

  try {
    // Si por alguna razón el panel no estaba registrado (mensaje antiguo), lo registramos ahora.
    const existing = getRankingPanel({ channelId, messageId });
    if (!existing) {
      registerRankingPanel({ channelId, messageId, guildId, view });
    } else {
      setRankingPanelView({ channelId, messageId, view });
    }

    await interaction.update({
      embeds: [buildRankingEmbed(guildId, view)],
      components: [rowBotones(view)],
      allowedMentions: { parse: [] },
    });
  } catch (err) {
    logger.error("ranking.viewButton.failed", { err: err.message });
    if (!interaction.replied && !interaction.deferred) {
      await interaction
        .reply({ content: "❌ Error al actualizar el ranking.", flags: 64 })
        .catch(() => {});
    }
  }
}

// ---------------------------------------------------------------------------
// Refresco automático tras cada evento finalizado
// ---------------------------------------------------------------------------
async function refreshAllPanels(guildId) {
  if (!clientRef) return;
  const panels = listRankingPanels(guildId);
  if (!panels.length) return;

  for (const p of panels) {
    try {
      const channel = clientRef.channels.cache.get(p.channel_id)
        ?? await clientRef.channels.fetch(p.channel_id).catch(() => null);
      if (!channel?.isTextBased?.()) {
        unregisterRankingPanel({ channelId: p.channel_id, messageId: p.message_id });
        continue;
      }
      const msg = await channel.messages.fetch(p.message_id).catch(() => null);
      if (!msg) {
        unregisterRankingPanel({ channelId: p.channel_id, messageId: p.message_id });
        continue;
      }
      await msg.edit({
        embeds: [buildRankingEmbed(p.guild_id, p.view || "total")],
        components: [rowBotones(p.view || "total")],
        allowedMentions: { parse: [] },
      });
    } catch (err) {
      logger.warn("ranking.panelRefresh.failed", {
        channel: p.channel_id,
        msg: p.message_id,
        err: err.message,
      });
    }
  }
}
