// Panel de administración de "lugares de enfrentamiento" (battle_grounds).
// Cada lugar tiene: nombre, info opcional (rango de niveles, etc.), coords de
// defensa y coords de ataque.

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
  createBattleGround,
  deleteBattleGround,
  getBattleGround,
  listBattleGrounds,
  updateBattleGround,
} from "../db.js";
import { audit } from "../audit.js";

// ---------------------------------------------------------------------------
// Embeds y rows
// ---------------------------------------------------------------------------
export function buildLugaresEmbed() {
  const list = listBattleGrounds();
  const embed = new EmbedBuilder()
    .setTitle("📍 Lugares de enfrentamiento")
    .setColor(0x5865f2)
    .setDescription("Configura los lugares donde se realizan los asaltos. Cada lugar tiene coords de defensa y de ataque.");

  if (!list.length) {
    embed.addFields({ name: "Lugares registrados", value: "_sin lugares_" });
    return embed;
  }

  const lineas = list.map((b) => {
    const info = b.info ? ` _(${b.info})_` : "";
    return `• **${b.name}**${info}\n   🛡️ Def: \`${b.coords_def}\`\n   ⚔️ Atk: \`${b.coords_atk}\``;
  });
  embed.addFields({ name: `Lugares (${list.length})`, value: lineas.join("\n\n") });
  return embed;
}

export function buildLugaresAdminRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("lugares:create").setStyle(ButtonStyle.Success).setLabel("Crear lugar").setEmoji("➕"),
    new ButtonBuilder().setCustomId("lugares:edit").setStyle(ButtonStyle.Primary).setLabel("Editar lugar").setEmoji("✏️"),
    new ButtonBuilder().setCustomId("lugares:delete").setStyle(ButtonStyle.Danger).setLabel("Eliminar lugar").setEmoji("🗑️"),
    new ButtonBuilder().setCustomId("lugares:refresh").setStyle(ButtonStyle.Secondary).setLabel("Refrescar").setEmoji("🔄"),
  );
}

function rowSelectLugar(action /* "edit" | "delete" */) {
  const list = listBattleGrounds();
  const sel = new StringSelectMenuBuilder()
    .setCustomId(`lugares:select:${action}`)
    .setPlaceholder(action === "edit" ? "Selecciona el lugar a editar..." : "Selecciona el lugar a eliminar...")
    .setMinValues(1)
    .setMaxValues(1);

  if (!list.length) {
    sel.addOptions({ label: "(sin lugares)", value: "0" }).setDisabled(true);
  } else {
    sel.addOptions(list.slice(0, 25).map((b) => ({
      label: b.name.slice(0, 100),
      value: String(b.id),
      description: (b.info || `def: ${b.coords_def}`).slice(0, 100),
    })));
  }
  return new ActionRowBuilder().addComponents(sel);
}

function rowVolver() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("lugares:back").setStyle(ButtonStyle.Secondary).setLabel("Volver").setEmoji("⬅️"),
  );
}

function buildModalCreate() {
  return new ModalBuilder()
    .setCustomId("lugares:modal:create")
    .setTitle("Crear lugar de enfrentamiento")
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId("name").setLabel("Nombre").setStyle(TextInputStyle.Short).setMaxLength(50).setRequired(true).setPlaceholder("Ej: Kaos"),
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId("info").setLabel("Info (rango, opcional)").setStyle(TextInputStyle.Short).setMaxLength(100).setRequired(false).setPlaceholder("Ej: 15-20"),
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId("def").setLabel("Coords de defensa").setStyle(TextInputStyle.Short).setMaxLength(100).setRequired(true).setPlaceholder("x,y,z,r"),
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId("atk").setLabel("Coords de ataque").setStyle(TextInputStyle.Short).setMaxLength(100).setRequired(true).setPlaceholder("x,y,z,r"),
      ),
    );
}

function buildModalEdit(bg) {
  return new ModalBuilder()
    .setCustomId(`lugares:modal:edit:${bg.id}`)
    .setTitle("Editar lugar")
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId("name").setLabel("Nombre").setStyle(TextInputStyle.Short).setMaxLength(50).setRequired(true).setValue(bg.name),
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId("info").setLabel("Info (opcional)").setStyle(TextInputStyle.Short).setMaxLength(100).setRequired(false).setValue(bg.info || ""),
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId("def").setLabel("Coords de defensa").setStyle(TextInputStyle.Short).setMaxLength(100).setRequired(true).setValue(bg.coords_def),
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId("atk").setLabel("Coords de ataque").setStyle(TextInputStyle.Short).setMaxLength(100).setRequired(true).setValue(bg.coords_atk),
      ),
    );
}

// ---------------------------------------------------------------------------
// Entry points
// ---------------------------------------------------------------------------
export async function replyLugaresAdmin(interaction) {
  const { ensureAdmin } = await import("../permissions.js");
  if (!(await ensureAdmin(interaction))) return;
  await interaction.reply({
    embeds: [buildLugaresEmbed()],
    components: [buildLugaresAdminRow()],
    ephemeral: true,
  });
}

async function showAdminPanel(interaction) {
  await interaction.update({
    embeds: [buildLugaresEmbed()],
    components: [buildLugaresAdminRow()],
  });
}

export async function handleLugaresButton(interaction, action) {
  switch (action) {
    case "create":
      await interaction.showModal(buildModalCreate());
      return;
    case "edit":
      await interaction.update({
        embeds: [
          new EmbedBuilder()
            .setTitle("✏️ Editar lugar")
            .setDescription("Selecciona el lugar a editar.")
            .setColor(0x5865f2),
        ],
        components: [rowSelectLugar("edit"), rowVolver()],
      });
      return;
    case "delete":
      await interaction.update({
        embeds: [
          new EmbedBuilder()
            .setTitle("🗑️ Eliminar lugar")
            .setDescription("Selecciona el lugar a eliminar.")
            .setColor(0xed4245),
        ],
        components: [rowSelectLugar("delete"), rowVolver()],
      });
      return;
    case "refresh":
    case "back":
      await showAdminPanel(interaction);
      return;
  }
}

export async function handleLugaresSelect(interaction, action) {
  const id = Number(interaction.values[0]);
  const bg = getBattleGround(id);
  if (!bg) {
    return interaction.reply({ content: "❌ Lugar no encontrado.", ephemeral: true });
  }

  if (action === "edit") {
    await interaction.showModal(buildModalEdit(bg));
    return;
  }

  // delete -> confirmación
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`lugares:confirmDelete:${bg.id}`).setStyle(ButtonStyle.Danger).setLabel("Eliminar").setEmoji("🗑️"),
    new ButtonBuilder().setCustomId("lugares:back").setStyle(ButtonStyle.Secondary).setLabel("Cancelar"),
  );
  await interaction.update({
    embeds: [
      new EmbedBuilder()
        .setTitle("🗑️ Confirmar eliminación")
        .setDescription(`¿Seguro que quieres eliminar **${bg.name}**?`)
        .setColor(0xed4245),
    ],
    components: [row],
  });
}

export async function handleLugaresConfirmDelete(interaction, id) {
  const bg = getBattleGround(Number(id));
  deleteBattleGround(Number(id));
  audit("lugar.delete", { userId: interaction.user.id, guildId: interaction.guild?.id, name: bg?.name, id });
  await showAdminPanel(interaction);
}

export async function handleLugaresModalCreate(interaction) {
  const name = interaction.fields.getTextInputValue("name");
  const info = interaction.fields.getTextInputValue("info") || "";
  const def  = interaction.fields.getTextInputValue("def");
  const atk  = interaction.fields.getTextInputValue("atk");
  try {
    createBattleGround({ name, coordsDef: def, coordsAtk: atk, info });
  } catch (e) {
    return interaction.reply({ content: `❌ ${e.message}`, ephemeral: true });
  }
  audit("lugar.create", { userId: interaction.user.id, guildId: interaction.guild?.id, name, info, coords_def: def, coords_atk: atk });
  await interaction.update?.({
    embeds: [buildLugaresEmbed()],
    components: [buildLugaresAdminRow()],
  }).catch(async () => {
    await interaction.reply({ content: `✅ Lugar creado: **${name}**`, ephemeral: true });
  });
}

export async function handleLugaresModalEdit(interaction, id) {
  const name = interaction.fields.getTextInputValue("name");
  const info = interaction.fields.getTextInputValue("info") || "";
  const def  = interaction.fields.getTextInputValue("def");
  const atk  = interaction.fields.getTextInputValue("atk");
  try {
    updateBattleGround(Number(id), { name, coordsDef: def, coordsAtk: atk, info });
  } catch (e) {
    return interaction.reply({ content: `❌ ${e.message}`, ephemeral: true });
  }
  audit("lugar.update", { userId: interaction.user.id, guildId: interaction.guild?.id, id, name, info, coords_def: def, coords_atk: atk });
  await interaction.update?.({
    embeds: [buildLugaresEmbed()],
    components: [buildLugaresAdminRow()],
  }).catch(async () => {
    await interaction.reply({ content: `✅ Lugar actualizado: **${name}**`, ephemeral: true });
  });
}
