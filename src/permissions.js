// Comprueba si un miembro tiene rol admin del bot configurado por servidor,
// o el permiso ManageGuild como fallback.

import { PermissionFlagsBits } from "discord.js";
import { getGuildConfig } from "./guildConfig.js";

export function isAdmin(member) {
  if (!member) return false;
  // Permiso nativo siempre vale
  if (member.permissions?.has?.(PermissionFlagsBits.ManageGuild)) return true;

  const cfg = getGuildConfig(member.guild.id);
  if (cfg?.adminRoleId && member.roles?.cache?.has?.(cfg.adminRoleId)) return true;
  return false;
}

export async function ensureAdmin(interaction) {
  const ok = isAdmin(interaction.member);
  if (!ok) {
    if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: "🚫 No tienes permiso para usar este comando. Pide a un administrador que te asigne el rol configurado o usa `/config`.",
        flags: 64,
      });
    }
  }
  return ok;
}
