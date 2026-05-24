// Comando /config: configurar rol admin, categoría de asaltos y canal de logs por servidor.

import {
  ActionRowBuilder,
  ChannelSelectMenuBuilder,
  ChannelType,
  EmbedBuilder,
  RoleSelectMenuBuilder,
} from "discord.js";

import { ensureAdmin } from "../permissions.js";
import { getGuildConfig, setGuildConfig } from "../guildConfig.js";
import { audit } from "../audit.js";

function buildConfigEmbed(cfg, guild) {
  const role = cfg.adminRoleId ? `<@&${cfg.adminRoleId}>` : "_no configurado_";
  const cat = cfg.categoryId ? `<#${cfg.categoryId}>` : "_no configurado_";
  const log = cfg.logChannelId ? `<#${cfg.logChannelId}>` : "_no configurado_";
  return new EmbedBuilder()
    .setTitle(`⚙️ Configuración — ${guild.name}`)
    .setColor(0x5865f2)
    .setDescription("Personaliza qué rol gestiona el bot, dónde se crean los canales privados y dónde se publican los resúmenes.")
    .addFields(
      { name: "🛡️ Rol administrador del bot", value: role },
      { name: "📂 Categoría de asaltos", value: cat },
      { name: "📜 Canal de logs", value: log },
    );
}

function buildRows() {
  return [
    new ActionRowBuilder().addComponents(
      new RoleSelectMenuBuilder()
        .setCustomId("config:role")
        .setPlaceholder("Selecciona el rol administrador del bot..."),
    ),
    new ActionRowBuilder().addComponents(
      new ChannelSelectMenuBuilder()
        .setCustomId("config:category")
        .setChannelTypes(ChannelType.GuildCategory)
        .setPlaceholder("Selecciona la categoría de asaltos..."),
    ),
    new ActionRowBuilder().addComponents(
      new ChannelSelectMenuBuilder()
        .setCustomId("config:log")
        .setChannelTypes(ChannelType.GuildText)
        .setPlaceholder("Selecciona el canal de logs..."),
    ),
  ];
}

export async function replyConfig(interaction) {
  if (!(await ensureAdmin(interaction))) return;
  const cfg = getGuildConfig(interaction.guild.id);
  await interaction.reply({
    embeds: [buildConfigEmbed(cfg, interaction.guild)],
    components: buildRows(),
    flags: 64,
  });
}

export async function handleConfigSelect(interaction) {
  if (!(await ensureAdmin(interaction))) return;
  const id = interaction.customId;
  const value = interaction.values[0];
  const patch = {};
  if (id === "config:role") patch.adminRoleId = value;
  else if (id === "config:category") patch.categoryId = value;
  else if (id === "config:log") patch.logChannelId = value;

  const cfg = setGuildConfig(interaction.guild.id, patch);
  audit("config.update", { userId: interaction.user.id, guildId: interaction.guild.id, patch });
  await interaction.update({
    embeds: [buildConfigEmbed(cfg, interaction.guild)],
    components: buildRows(),
  });
}
