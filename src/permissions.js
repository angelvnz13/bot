// Comprueba si un miembro tiene rol admin del bot configurado por servidor,
// o el permiso ManageGuild como fallback.

import { PermissionFlagsBits } from "discord.js";
import { getGuildConfig } from "./guildConfig.js";

export async function isAdmin(member) {
  if (!member) return false;
  if (member.permissions?.has?.(PermissionFlagsBits.ManageGuild)) return true;

  const cfg = await getGuildConfig(member.guild.id);
  if (cfg?.adminRoleId && member.roles?.cache?.has?.(cfg.adminRoleId)) return true;
  return false;
}

export async function ensureAdmin(interaction) {
  const ok = await isAdmin(interaction.member);
  if (!ok) {
    if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: "🚫 No tienes permiso para usar este comando. Pide a un administrador que te asigne el rol configurado o usa `/config`.",
        ephemeral: true,
      });
    }
  }
  return ok;
}
