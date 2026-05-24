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

import {
  createSede,
  deleteSede,
  getSede,
  listSedes,
  updateSede,
} from "../db.js";
import { audit } from "../audit.js";

export function buildListaEmbed() {
  const sedes = listSedes();
  const embed = new EmbedBuilder()
    .setTitle("🗂️ Gestión de Sedes")
    .setDescription("Administra las sedes, sus emojis y coordenadas.")
    .setColor(0x5865f2);

  if (sedes.length === 0) {
    embed.addFields({ name: "Sedes registradas", value: "_Sin sedes_" });
    return embed;
  }

  const lineas = sedes.map((s) => {
    const e = s.emoji ? `${s.emoji} ` : "";
    return `• ${e}**${s.name}** — \`${s.coords || "sin coords"}\``;
  });
  const chunks = [];
  let actual = "";
  for (const l of lineas) {
    if (actual.length + l.length + 1 > 1000) {
      chunks.push(actual);
      actual = "";
    }
    actual += (actual ? "\n" : "") + l;
  }
  if (actual) chunks.push(actual);

  chunks.forEach((chunk, i) => {
    embed.addFields({
      name: i === 0 ? `Sedes registradas (${sedes.length})` : "\u200b",
      value: chunk,
    });
  });
  return embed;
}

export function buildAdminRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("sedes:create").setStyle(ButtonStyle.Success).setLabel("Crear sede").setEmoji("➕"),
    new ButtonBuilder().setCustomId("sedes:edit").setStyle(ButtonStyle.Primary).setLabel("Editar sede").setEmoji("✏️"),
    new ButtonBuilder().setCustomId("sedes:delete").setStyle(ButtonStyle.Danger).setLabel("Eliminar sede").setEmoji("🗑️"),
    new ButtonBuilder().setCustomId("sedes:refresh").setStyle(ButtonStyle.Secondary).setLabel("Refrescar").setEmoji("🔄"),
  );
}

export async function replySedesAdmin(interaction) {
  const { ensureAdmin } = await import("../permissions.js");
  if (!(await ensureAdmin(interaction))) return;
  await interaction.reply({
    embeds: [buildListaEmbed()],
    components: [buildAdminRow()],
    ephemeral: true,
  });
}

export async function sendSedesAdmin(channel) {
  await channel.send({
    embeds: [buildListaEmbed()],
    components: [buildAdminRow()],
  });
}

// --- Acciones internas ----------------------------------------------------

export async function showAdminPanel(interaction) {
  await interaction.update({
    embeds: [buildListaEmbed()],
    components: [buildAdminRow()],
  });
}

export function buildSelectSedeRow(action /* "edit" | "delete" */) {
  const sedes = listSedes();
  const select = new StringSelectMenuBuilder()
    .setCustomId(`sedes:select:${action}`)
    .setPlaceholder(action === "edit" ? "Selecciona la sede a editar..." : "Selecciona la sede a eliminar...")
    .setMinValues(1)
    .setMaxValues(1);

  if (sedes.length === 0) {
    select.addOptions({ label: "(sin sedes)", value: "0" }).setDisabled(true);
  } else {
    select.addOptions(
      sedes.slice(0, 25).map((s) => ({
        label: s.name.slice(0, 100),
        value: String(s.id),
        description: (s.coords || "").slice(0, 100) || undefined,
      })),
    );
  }
  return new ActionRowBuilder().addComponents(select);
}

export function buildBackRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("sedes:back").setStyle(ButtonStyle.Secondary).setLabel("Volver").setEmoji("⬅️"),
  );
}

export function buildCreateModal() {
  return new ModalBuilder()
    .setCustomId("sedes:modal:create")
    .setTitle("Crear sede")
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId("name").setLabel("Nombre de la sede").setStyle(TextInputStyle.Short).setMaxLength(50).setRequired(true),
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId("emoji").setLabel("Emoji (opcional)").setStyle(TextInputStyle.Short).setMaxLength(10).setRequired(false).setPlaceholder("Ej: 🦁  o  <:nombre:123456789>"),
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId("coords").setLabel("Coordenadas").setStyle(TextInputStyle.Short).setMaxLength(100).setRequired(false),
      ),
    );
}

export function buildEditModal(sede) {
  return new ModalBuilder()
    .setCustomId(`sedes:modal:edit:${sede.id}`)
    .setTitle("Editar sede")
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId("name").setLabel("Nombre de la sede").setStyle(TextInputStyle.Short).setMaxLength(50).setRequired(true).setValue(sede.name),
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId("emoji").setLabel("Emoji (opcional)").setStyle(TextInputStyle.Short).setMaxLength(10).setRequired(false).setValue(sede.emoji || "").setPlaceholder("Ej: 🦁  o  <:nombre:123456789>"),
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId("coords").setLabel("Coordenadas").setStyle(TextInputStyle.Short).setMaxLength(100).setRequired(false).setValue(sede.coords || ""),
      ),
    );
}

// --- Handlers de interacciones -------------------------------------------

export async function handleSedesButton(interaction, action) {
  switch (action) {
    case "create":
      await interaction.showModal(buildCreateModal());
      return;
    case "edit":
      await interaction.update({
        embeds: [
          new EmbedBuilder()
            .setTitle("✏️ Editar sede")
            .setDescription("Selecciona la sede que quieres editar.")
            .setColor(0x5865f2),
        ],
        components: [buildSelectSedeRow("edit"), buildBackRow()],
      });
      return;
    case "delete":
      await interaction.update({
        embeds: [
          new EmbedBuilder()
            .setTitle("🗑️ Eliminar sede")
            .setDescription("Selecciona la sede que quieres eliminar.")
            .setColor(0xed4245),
        ],
        components: [buildSelectSedeRow("delete"), buildBackRow()],
      });
      return;
    case "refresh":
    case "back":
      await showAdminPanel(interaction);
      return;
  }
}

export async function handleSedesSelect(interaction, action) {
  const id = Number(interaction.values[0]);
  const sede = getSede(id);
  if (!sede) {
    await interaction.reply({ content: "❌ La sede ya no existe.", ephemeral: true });
    return;
  }

  if (action === "edit") {
    await interaction.showModal(buildEditModal(sede));
    return;
  }

  // delete -> confirmación
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`sedes:confirmDelete:${sede.id}`).setStyle(ButtonStyle.Danger).setLabel("Eliminar").setEmoji("🗑️"),
    new ButtonBuilder().setCustomId("sedes:back").setStyle(ButtonStyle.Secondary).setLabel("Cancelar"),
  );
  await interaction.update({
    embeds: [
      new EmbedBuilder()
        .setTitle("🗑️ Confirmar eliminación")
        .setDescription(`¿Seguro que quieres eliminar **${sede.name}**?`)
        .setColor(0xed4245),
    ],
    components: [row],
  });
}

export async function handleSedesConfirmDelete(interaction, id) {
  const sede = getSede(Number(id));
  deleteSede(Number(id));
  audit("sede.delete", { userId: interaction.user.id, guildId: interaction.guild?.id, sede: sede?.name, id });
  await showAdminPanel(interaction);
}

export async function handleSedesModalCreate(interaction) {
  const name = interaction.fields.getTextInputValue("name");
  const coords = interaction.fields.getTextInputValue("coords") || "";
  const emoji = interaction.fields.getTextInputValue("emoji") || "";
  try {
    createSede(name, coords, emoji);
  } catch (e) {
    await interaction.reply({ content: `❌ ${e.message}`, ephemeral: true });
    return;
  }
  audit("sede.create", { userId: interaction.user.id, guildId: interaction.guild?.id, name, coords, emoji });
  await interaction.update?.({
    embeds: [buildListaEmbed()],
    components: [buildAdminRow()],
  }).catch(async () => {
    await interaction.reply({ content: `✅ Sede creada: **${name}**`, ephemeral: true });
  });
}

export async function handleSedesModalEdit(interaction, id) {
  const name = interaction.fields.getTextInputValue("name");
  const coords = interaction.fields.getTextInputValue("coords") || "";
  const emoji = interaction.fields.getTextInputValue("emoji") || "";
  try {
    updateSede(Number(id), name, coords, emoji);
  } catch (e) {
    await interaction.reply({ content: `❌ ${e.message}`, ephemeral: true });
    return;
  }
  audit("sede.update", { userId: interaction.user.id, guildId: interaction.guild?.id, id, name, coords, emoji });
  await interaction.update?.({
    embeds: [buildListaEmbed()],
    components: [buildAdminRow()],
  }).catch(async () => {
    await interaction.reply({ content: `✅ Sede actualizada: **${name}**`, ephemeral: true });
  });
}
