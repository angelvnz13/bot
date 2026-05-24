// Embeds del Rey del Crimen.

import { EmbedBuilder } from "discord.js";

import { listSedes } from "../../db.js";
import { buildResumenLinea, statusEmoji } from "./state.js";

export function buildWizardEmbed(state) {
  const sel = state.staffIds.length
    ? state.staffIds.map((id) => `<@${id}>`).join(" ")
    : "_ninguno_";
  return new EmbedBuilder()
    .setTitle("👑 Configurar Rey del Crimen")
    .setColor(0x5865f2)
    .setDescription("Selecciona los **leones** que participarán. Las sedes se repartirán entre ellos al iniciar.")
    .addFields(
      { name: "🦁 Leones seleccionados", value: sel },
      { name: "🗂️ Sedes registradas", value: String(listSedes().length), inline: true },
    );
}

export function buildPanelEmbed(state) {
  const bloques = state.leones.map((l) => {
    const head = `<@${l.userId}>`;
    if (!l.sedes.length) return `${head}\n  _sin sedes_`;
    const items = l.sedes.map((s) => {
      const razon = s.razon ? ` _(${s.razon})_` : "";
      const titulo = `${statusEmoji(s.status)} **${s.sede.name}**${razon}`;
      return s.sede.coords
        ? `${titulo}\n\`\`\`${s.sede.coords}\`\`\``
        : titulo;
    });
    return `${head}\n${items.join("\n")}`;
  });

  const description =
    "Pulsa uno de los botones para marcar el estado de **tus** sedes. " +
    "Aparecerá un selector privado con las sedes asignadas a ti.\n\n" +
    (bloques.length ? bloques.join("\n\n") : "_sin leones_");

  return new EmbedBuilder()
    .setTitle("👑 REY DEL CRIMEN")
    .setColor(0x9b59b6)
    .setDescription(description.slice(0, 4096))
    .addFields({ name: "Resumen", value: buildResumenLinea(state) });
}

export function buildResumenEmbed(state, { cancelado }) {
  const bloques = state.leones.map((l) => {
    const head = `<@${l.userId}>`;
    if (!l.sedes.length) return `${head}\n  _sin sedes_`;
    const items = l.sedes.map((s) => {
      const razon = s.razon ? ` _(razón: ${s.razon})_` : "";
      const titulo = `${statusEmoji(s.status)} **${s.sede.name}**${razon}`;
      return s.sede.coords
        ? `${titulo}\n\`\`\`${s.sede.coords}\`\`\``
        : titulo;
    });
    return `${head}\n${items.join("\n")}`;
  });

  const description = bloques.join("\n\n").slice(0, 4096);

  return new EmbedBuilder()
    .setTitle(cancelado ? "🛑 REY DEL CRIMEN CANCELADO" : "👑 REY DEL CRIMEN FINALIZADO")
    .setColor(cancelado ? 0x95a5a6 : 0x9b59b6)
    .setDescription(description)
    .addFields({ name: "Resumen", value: buildResumenLinea(state) });
}
