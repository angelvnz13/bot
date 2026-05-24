// /forgetme: elimina del bot los datos personales del usuario que invoca.

import { EmbedBuilder } from "discord.js";

import { deleteEventsForUser, query } from "../db.js";
import { audit, forgetUserFromAudit } from "../audit.js";

export async function replyForgetMe(interaction) {
  const userId = interaction.user.id;

  // Eliminar asaltos persistidos donde aparezca el userId
  const result = await query(
    "DELETE FROM asaltos_activos WHERE state_json LIKE '%\"' || $1 || '\"%'",
    [userId],
  );
  const removed = result.rowCount;

  const removedEvents = await deleteEventsForUser(userId);
  const auditResult = forgetUserFromAudit(userId);

  audit("privacy.forgetme", {
    userId,
    guildId: interaction.guild?.id,
    removedAsaltos: removed,
    removedEventLog: removedEvents,
    removedAuditEntries: auditResult.removed,
    skippedAuditEntries: auditResult.skipped,
  });

  const embed = new EmbedBuilder()
    .setTitle("🧹 Datos eliminados")
    .setColor(0x95a5a6)
    .setDescription(
      "Se ha procesado tu solicitud de derecho al olvido (RGPD).\n\n" +
      `• Asaltos persistidos eliminados: **${removed}**\n` +
      `• Entradas del ranking eliminadas: **${removedEvents}**\n` +
      `• Entradas de auditoría eliminadas: **${auditResult.removed}** (omitidas: ${auditResult.skipped})\n\n` +
      "Los embeds publicados que ya están en canales de Discord no son borrados automáticamente. Si quieres que un mensaje específico se elimine, contacta con un administrador del servidor."
    );

  await interaction.reply({ embeds: [embed], ephemeral: true });
}
