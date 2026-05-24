// Asistente de configuración del asalto: pasos de wizard + arranque del evento.

import { ChannelType, PermissionFlagsBits } from "discord.js";

import { getSede, listSedes } from "../../db.js";
import { getBattleGround, listBattleGrounds } from "../../db.js";
import { getGuildConfig } from "../../guildConfig.js";
import {
  deleteWizard,
  getWizard,
  setAsalto,
  setWizard,
} from "../../state.js";
import { audit } from "../../audit.js";

import { newAsaltoState } from "./state.js";
import { buildSetupEmbed, buildPreInicioEmbed } from "./embeds.js";
import {
  rowIniciar,
  rowLugarSelect,
  rowPreInicio,
  rowSedeAtk,
  rowSedeDef,
  rowStaff,
} from "./components.js";

async function wizardExpired(interaction) {
  await interaction.reply({
    content: "⚠️ La sesión de configuración expiró. Vuelve a abrir `/evento`.",
    flags: 64,
  });
}

export async function startWizard(interaction) {
  if (!listSedes().length) {
    await interaction.reply({
      content: "❌ No hay sedes registradas. Usa `/sedes` para crear sedes primero.",
      flags: 64,
    });
    return;
  }
  if (!listBattleGrounds().length) {
    await interaction.reply({
      content: "❌ No hay lugares de enfrentamiento. Usa `/lugares` para crearlos primero.",
      flags: 64,
    });
    return;
  }

  const state = newAsaltoState(interaction.user.id);
  setWizard(interaction.user.id, state);

  await interaction.reply({
    embeds: [buildSetupEmbed(state, "Selecciona la **sede donde se enfrentan**")],
    components: [rowLugarSelect()],
    flags: 64,
  });
}

export async function wizardLugar(interaction) {
  const state = getWizard(interaction.user.id);
  if (!state) return wizardExpired(interaction);
  state.battleground = getBattleGround(Number(interaction.values[0]));
  if (!state.battleground) {
    return interaction.reply({
      content: "❌ Lugar no encontrado. Configura los lugares con `/lugares`.",
      flags: 64,
    });
  }
  await interaction.update({
    embeds: [buildSetupEmbed(state, "Selecciona la **sede que DEFIENDE** 🛡️")],
    components: [rowSedeDef()],
  });
}

export async function wizardDef(interaction) {
  const state = getWizard(interaction.user.id);
  if (!state) return wizardExpired(interaction);
  state.sedeDef = getSede(Number(interaction.values[0]));
  await interaction.update({
    embeds: [buildSetupEmbed(state, "Selecciona la **sede que ATACA** ⚔️")],
    components: [rowSedeAtk(state.sedeDef.id)],
  });
}

export async function wizardAtk(interaction) {
  const state = getWizard(interaction.user.id);
  if (!state) return wizardExpired(interaction);
  state.sedeAtk = getSede(Number(interaction.values[0]));
  await interaction.update({
    embeds: [buildSetupEmbed(state, "Selecciona los **leones (staff)** que participan 🦁")],
    components: [rowStaff(), rowIniciar()],
  });
}

export async function wizardStaff(interaction) {
  const state = getWizard(interaction.user.id);
  if (!state) return wizardExpired(interaction);
  state.staffIds = [...interaction.values];
  await interaction.update({
    embeds: [buildSetupEmbed(state, "Pulsa **Iniciar Asalto** cuando esté todo listo")],
    components: [rowStaff(), rowIniciar()],
  });
}

export async function wizardCancel(interaction) {
  deleteWizard(interaction.user.id);
  await interaction.update({ content: "❌ Configuración cancelada.", embeds: [], components: [] });
}

export async function wizardStart(interaction) {
  const state = getWizard(interaction.user.id);
  if (!state) return wizardExpired(interaction);

  if (!state.battleground || !state.sedeDef || !state.sedeAtk) {
    await interaction.reply({ content: "❌ Debes completar todos los pasos antes de iniciar.", flags: 64 });
    return;
  }
  if (!state.staffIds.length) {
    await interaction.reply({ content: "❌ Debes seleccionar al menos un león (staff).", flags: 64 });
    return;
  }

  const guild = interaction.guild;
  if (!guild) {
    await interaction.reply({ content: "❌ Solo funciona en un servidor.", flags: 64 });
    return;
  }

  const cfg = getGuildConfig(guild.id);
  const category = guild.channels.cache.get(cfg.categoryId)
    ?? await guild.channels.fetch(cfg.categoryId).catch(() => null);
  if (!category || category.type !== ChannelType.GuildCategory) {
    await interaction.reply({
      content: `❌ No encontré la categoría con ID \`${cfg.categoryId}\`. Configúrala con \`/config\`.`,
      flags: 64,
    });
    return;
  }

  state.score = { [state.sedeAtk.name]: 0, [state.sedeDef.name]: 0 };
  state.guildId = guild.id;

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
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
      ],
    },
  ];
  for (const uid of state.staffIds) {
    overwrites.push({
      id: uid,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
      ],
    });
  }

  const channelName = `asalto-${state.sedeAtk.name}-vs-${state.sedeDef.name}`
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\-]/g, "")
    .slice(0, 90) || "asalto";

  let canal;
  try {
    canal = await guild.channels.create({
      name: channelName,
      type: ChannelType.GuildText,
      parent: category.id,
      permissionOverwrites: overwrites,
      reason: `Canal privado de asalto creado por ${interaction.user.tag}`,
    });
  } catch (e) {
    await interaction.reply({
      content: `❌ Error al crear el canal privado: \`${e.message}\``,
      flags: 64,
    });
    return;
  }

  state.privateChannelId = canal.id;

  await interaction.update({
    content: `✅ Asalto iniciado. Canal privado creado: <#${canal.id}>`,
    embeds: [],
    components: [],
  });

  const panel = await canal.send({
    content: `🦁 ${state.staffIds.map((id) => `<@${id}>`).join(" ")}\nPanel de control del asalto ⬇️`,
    embeds: [buildPreInicioEmbed(state)],
    allowedMentions: { users: state.staffIds, roles: [], parse: [] },
  });

  state.panelMessageId = panel.id;
  setAsalto(panel.id, state);
  deleteWizard(interaction.user.id);

  audit("asalto.start", {
    userId: interaction.user.id,
    guildId: guild.id,
    panelMessageId: panel.id,
    privateChannelId: canal.id,
    atk: state.sedeAtk.name,
    def: state.sedeDef.name,
    lugar: state.battleground?.name,
    staff: state.staffIds,
  });

  await panel.edit({ components: [rowPreInicio(panel.id)] });
}
