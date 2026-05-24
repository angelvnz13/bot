// Wizard de configuración + arranque del Rey del Crimen.

import { ChannelType, PermissionFlagsBits } from "discord.js";

import { listSedes } from "../../db.js";
import { getGuildConfig } from "../../guildConfig.js";
import { audit } from "../../audit.js";

import {
  newReyState,
  newWizard,
  repartirSedes,
  reyWizards,
  reyes,
} from "./state.js";
import { buildPanelEmbed, buildWizardEmbed } from "./embeds.js";
import {
  panelComponents,
  rowWizardActions,
  rowWizardStaff,
} from "./components.js";

export async function startWizard(interaction) {
  const sedesCount = (await listSedes()).length;
  if (!sedesCount) {
    return interaction.reply({ content: "❌ No hay sedes registradas. Crea sedes con `/sedes` primero.", ephemeral: true });
  }
  const w = newWizard(interaction.user.id);
  reyWizards.set(interaction.user.id, w);
  await interaction.reply({
    embeds: [await buildWizardEmbed(w)],
    components: [rowWizardStaff(), rowWizardActions()],
    ephemeral: true,
  });
}

export async function wizardStaff(interaction) {
  const w = reyWizards.get(interaction.user.id);
  if (!w) return interaction.reply({ content: "⚠️ La sesión expiró. Vuelve a abrir `/evento`.", ephemeral: true });
  w.staffIds = [...interaction.values];
  await interaction.update({
    embeds: [await buildWizardEmbed(w)],
    components: [rowWizardStaff(), rowWizardActions()],
  });
}

export async function wizardCancel(interaction) {
  reyWizards.delete(interaction.user.id);
  await interaction.update({ content: "❌ Configuración cancelada.", embeds: [], components: [] });
}

export async function wizardStart(interaction) {
  const w = reyWizards.get(interaction.user.id);
  if (!w) return interaction.reply({ content: "⚠️ La sesión expiró. Vuelve a abrir `/evento`.", ephemeral: true });
  if (!w.staffIds.length) return interaction.reply({ content: "❌ Debes seleccionar al menos un león.", ephemeral: true });

  const guild = interaction.guild;
  if (!guild) return interaction.reply({ content: "❌ Solo funciona en un servidor.", ephemeral: true });

  const cfg = await getGuildConfig(guild.id);
  const category = guild.channels.cache.get(cfg.categoryId)
    ?? await guild.channels.fetch(cfg.categoryId).catch(() => null);
  if (!category || category.type !== ChannelType.GuildCategory) {
    return interaction.reply({
      content: `❌ No encontré la categoría con ID \`${cfg.categoryId}\`. Configúrala con \`/config\`.`,
      ephemeral: true,
    });
  }

  const sedes = await listSedes();
  const leones = repartirSedes(sedes, w.staffIds);
  const state = newReyState({ ownerId: interaction.user.id, guildId: guild.id, leones });

  // Canal privado
  const overwrites = [
    { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
    {
      id: guild.members.me.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.EmbedLinks,
        PermissionFlagsBits.ManageChannels,
        PermissionFlagsBits.ManageMessages,
        PermissionFlagsBits.ReadMessageHistory,
      ],
    },
    {
      id: interaction.user.id,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
    },
  ];
  for (const uid of w.staffIds) {
    overwrites.push({
      id: uid,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
    });
  }

  let canal;
  try {
    canal = await guild.channels.create({
      name: `rey-del-crimen-${Date.now().toString(36)}`.slice(0, 90),
      type: ChannelType.GuildText,
      parent: category.id,
      permissionOverwrites: overwrites,
      reason: `Rey del Crimen creado por ${interaction.user.tag}`,
    });
  } catch (e) {
    return interaction.reply({ content: `❌ Error al crear el canal privado: \`${e.message}\``, ephemeral: true });
  }
  state.privateChannelId = canal.id;

  await interaction.update({
    content: `✅ Rey del Crimen iniciado. Canal privado: <#${canal.id}>`,
    embeds: [],
    components: [],
  });

  const panel = await canal.send({
    content: `🦁 ${w.staffIds.map((id) => `<@${id}>`).join(" ")}`,
    embeds: [buildPanelEmbed(state)],
    allowedMentions: { users: w.staffIds, parse: [] },
  });
  state.panelMessageId = panel.id;
  await panel.edit({ components: panelComponents(panel.id) });

  reyes.set(panel.id, state);
  reyWizards.delete(interaction.user.id);

  audit("rey.start", {
    userId: interaction.user.id,
    guildId: guild.id,
    panelMessageId: panel.id,
    privateChannelId: canal.id,
    staff: w.staffIds,
    sedesCount: sedes.length,
  });
}
