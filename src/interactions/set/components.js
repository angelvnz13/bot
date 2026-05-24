// Componentes del flujo /set.

import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ModalBuilder,
  StringSelectMenuBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";

import { RANKS } from "./ranks.js";

export function buildPanelEmbed() {
  return new EmbedBuilder()
    .setTitle("📝 Verificación")
    .setColor(0x5865f2)
    .setDescription(
      "Pulsa **Verificarse** para registrar tu **nombre** e **ICID**, " +
      "y luego elige tu rango. El bot te asignará el rol y ajustará tu apodo automáticamente.",
    );
}

export function rowVerificarse() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("set:verify")
      .setStyle(ButtonStyle.Success)
      .setLabel("Verificarse")
      .setEmoji("✅"),
  );
}

export function buildVerificarModal() {
  return new ModalBuilder()
    .setCustomId("set:modal:verify")
    .setTitle("Verificación")
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("nombre")
          .setLabel("Nombre")
          .setStyle(TextInputStyle.Short)
          .setMaxLength(24)
          .setRequired(true)
          .setPlaceholder("Ej: Alice"),
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("icid")
          .setLabel("ICID")
          .setStyle(TextInputStyle.Short)
          .setMaxLength(15)
          .setRequired(true)
          .setPlaceholder("Ej: 73191"),
      ),
    );
}

export function rowRangoSelect() {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("set:rango")
      .setPlaceholder("Selecciona tu rango...")
      .setMinValues(1)
      .setMaxValues(1)
      .addOptions(
        RANKS.map((r) => ({
          label: r.label,
          value: r.key,
          emoji: r.emoji,
        })),
      ),
  );
}

// --- Solicitud de verificación (para los Aux) ---------------------------
export function buildSolicitudEmbed({ userId, rank, nombre, icid, status, decidedBy, motivo }) {
  const colorByStatus = {
    pending: 0xe67e22,
    approved: 0x2ecc71,
    rejected: 0xed4245,
  };
  const headerByStatus = {
    pending: "📥 Solicitud de verificación",
    approved: "✅ Solicitud aprobada",
    rejected: "🚫 Solicitud rechazada",
  };

  const embed = new EmbedBuilder()
    .setTitle(headerByStatus[status] ?? headerByStatus.pending)
    .setColor(colorByStatus[status] ?? colorByStatus.pending)
    .addFields(
      { name: "👤 Solicitante", value: `<@${userId}>`, inline: true },
      { name: "🪪 Nombre", value: nombre, inline: true },
      { name: "🆔 ICID", value: icid, inline: true },
      { name: "🏷️ Rango pedido", value: `${rank.emoji} ${rank.label}`, inline: true },
    );

  if (decidedBy) {
    embed.addFields({
      name: status === "approved" ? "✅ Aprobado por" : "🚫 Rechazado por",
      value: `<@${decidedBy}>`,
      inline: true,
    });
  }
  if (motivo) {
    embed.addFields({ name: "📝 Motivo del rechazo", value: motivo });
  }
  return embed;
}

export function rowSolicitudActions(messageId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`set:approve:${messageId}`)
      .setStyle(ButtonStyle.Success)
      .setLabel("Aprobar")
      .setEmoji("✅"),
    new ButtonBuilder()
      .setCustomId(`set:reject:${messageId}`)
      .setStyle(ButtonStyle.Danger)
      .setLabel("Rechazar")
      .setEmoji("🚫"),
  );
}

export function buildRechazoModal(messageId) {
  return new ModalBuilder()
    .setCustomId(`set:modal:reject:${messageId}`)
    .setTitle("Rechazar solicitud")
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("motivo")
          .setLabel("Motivo del rechazo")
          .setStyle(TextInputStyle.Paragraph)
          .setMaxLength(300)
          .setRequired(true)
          .setPlaceholder("Ej: nombre incorrecto, ICID no coincide..."),
      ),
    );
}

export function rowAprobacion(requestId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`set:approve:${requestId}`)
      .setStyle(ButtonStyle.Success)
      .setLabel("Verificar")
      .setEmoji("✅"),
    new ButtonBuilder()
      .setCustomId(`set:reject:${requestId}`)
      .setStyle(ButtonStyle.Danger)
      .setLabel("Rechazar")
      .setEmoji("❌"),
  );
}

export function buildAprobacionEmbed({ user, rank, nombre, icid, status = "pending", reviewerId = null }) {
  const colorMap = { pending: 0xe67e22, approved: 0x2ecc71, rejected: 0xed4245 };
  const titleMap = {
    pending: "📝 Solicitud de verificación",
    approved: "✅ Verificación aprobada",
    rejected: "❌ Verificación rechazada",
  };
  const e = new EmbedBuilder()
    .setTitle(titleMap[status])
    .setColor(colorMap[status])
    .addFields(
      { name: "Usuario",   value: `<@${user.id}>`, inline: true },
      { name: "Rango",     value: `${rank.emoji} ${rank.label}`, inline: true },
      { name: "Nombre",    value: nombre, inline: true },
      { name: "ICID",      value: icid, inline: true },
    );
  if (reviewerId) {
    e.addFields({ name: status === "approved" ? "Aprobado por" : "Rechazado por", value: `<@${reviewerId}>` });
  }
  return e;
}
