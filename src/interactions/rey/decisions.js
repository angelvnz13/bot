// Botones del panel y selector privado: aplican Irán / No iran / Tepeada.

import {
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";

import { audit } from "../../audit.js";

import {
  STATUS_IRAN,
  STATUS_NO_IRAN,
  STATUS_TEPEADA,
  findLeon,
  reyes,
} from "./state.js";
import { rowSelectorPrivado } from "./components.js";
import { refreshPanel } from "./refresh.js";

async function abrirSelectorPrivado(interaction, panelId, action) {
  const state = reyes.get(panelId);
  if (!state) {
    return interaction.reply({ content: "⚠️ Este evento ya no está activo.", ephemeral: true });
  }
  const ref = findLeon(state, interaction.user.id);
  if (!ref) {
    return interaction.reply({
      content: "🚫 No tienes sedes asignadas en este evento.",
      ephemeral: true,
    });
  }
  if (!ref.leon.sedes.length) {
    return interaction.reply({ content: "ℹ️ No tienes sedes asignadas.", ephemeral: true });
  }

  const titulo = action === "iran"
    ? "✅ Marcar como **Irán**"
    : action === "noiran"
      ? "🚫 Marcar como **No iran**"
      : "💢 Marcar como **Tepeada**";

  await interaction.reply({
    content: `${titulo}\nElige una de tus sedes:`,
    components: [rowSelectorPrivado(panelId, ref.leon, action)],
    ephemeral: true,
  });
}

export async function btnIran(interaction, panelId)    { return abrirSelectorPrivado(interaction, panelId, "iran"); }
export async function btnTepeada(interaction, panelId) { return abrirSelectorPrivado(interaction, panelId, "tepeada"); }
export async function btnNoIran(interaction, panelId)  { return abrirSelectorPrivado(interaction, panelId, "noiran"); }

// customId: rey:apply:<action>:<panelId>
export async function applySelection(interaction, action, panelId) {
  const state = reyes.get(panelId);
  if (!state) {
    return interaction.update({ content: "⚠️ Este evento ya no está activo.", components: [] });
  }
  const ref = findLeon(state, interaction.user.id);
  if (!ref) {
    return interaction.update({ content: "🚫 No tienes sedes asignadas.", components: [] });
  }
  const sedeIdx = Number(interaction.values[0]);
  const item = ref.leon.sedes[sedeIdx];
  if (!item) {
    return interaction.update({ content: "⚠️ Sede no encontrada.", components: [] });
  }

  if (action === "noiran") {
    const modal = new ModalBuilder()
      .setCustomId(`rey:modal:noiran:${panelId}:${sedeIdx}`)
      .setTitle("¿Por qué no irán?")
      .addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId("razon")
            .setLabel("Razón")
            .setStyle(TextInputStyle.Paragraph)
            .setMaxLength(300)
            .setRequired(true)
            .setPlaceholder("Ej: pocos miembros conectados"),
        ),
      );
    await interaction.showModal(modal);
    return;
  }

  const status = action === "iran" ? STATUS_IRAN : STATUS_TEPEADA;
  item.status = status;
  item.razon = null;
  audit("rey.decision", {
    userId: interaction.user.id,
    panelId,
    sede: item.sede.name,
    status,
  });

  const emojiMsg = status === STATUS_IRAN ? "✅" : "💢";
  const labelMsg = status === STATUS_IRAN ? "Irán" : "Tepeada";
  await interaction.update({
    content: `${emojiMsg} **${item.sede.name}** marcada como **${labelMsg}**.`,
    components: [],
  });
  await refreshPanel(interaction.client, state);
}

// customId: rey:modal:noiran:<panelId>:<sedeIdx>
export async function modalNoIran(interaction, panelId, sedeIdx) {
  const state = reyes.get(panelId);
  if (!state) return interaction.reply({ content: "⚠️ Este evento ya no está activo.", ephemeral: true });
  const ref = findLeon(state, interaction.user.id);
  if (!ref) return interaction.reply({ content: "🚫 No tienes sedes asignadas.", ephemeral: true });
  const item = ref.leon.sedes[Number(sedeIdx)];
  if (!item) return interaction.reply({ content: "⚠️ Sede no encontrada.", ephemeral: true });

  const razon = interaction.fields.getTextInputValue("razon").trim().slice(0, 300);
  item.status = STATUS_NO_IRAN;
  item.razon = razon;
  audit("rey.decision", {
    userId: interaction.user.id,
    panelId,
    sede: item.sede.name,
    status: STATUS_NO_IRAN,
    razon,
  });

  await interaction.reply({
    content: `🚫 **${item.sede.name}** marcada como **No iran**.\n📝 Razón: ${razon}`,
    ephemeral: true,
  });
  await refreshPanel(interaction.client, state);
}
