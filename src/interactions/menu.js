import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from "discord.js";

export function buildMenuEmbed() {
  return new EmbedBuilder()
    .setTitle("🎮 Menú de Eventos")
    .setDescription("Selecciona el tipo de evento a iniciar:")
    .setColor(0x5865f2)
    .addFields(
      { name: "🏰 Asalto a Sede",  value: "Enfrentamiento entre dos sedes" },
      { name: "👑 Rey del Crimen", value: "Última sede en pie" },
      { name: "⚔️ Battle Royale",  value: "Todos contra todos" },
    );
}

export function buildMenuRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("menu:asalto").setStyle(ButtonStyle.Danger).setLabel("Asalto a Sede").setEmoji("🏰"),
    new ButtonBuilder().setCustomId("menu:rey").setStyle(ButtonStyle.Primary).setLabel("Rey del Crimen").setEmoji("👑"),
    new ButtonBuilder().setCustomId("menu:battle").setStyle(ButtonStyle.Success).setLabel("Battle Royale").setEmoji("⚔️"),
  );
}

export async function replyMenuEventos(interaction) {
  await interaction.reply({
    embeds: [buildMenuEmbed()],
    components: [buildMenuRow()],
  });
}

export async function sendMenuEventos(channel) {
  await channel.send({
    embeds: [buildMenuEmbed()],
    components: [buildMenuRow()],
  });
}
