// Componentes (rows) del Rey del Crimen.

import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  UserSelectMenuBuilder,
} from "discord.js";

import { parseEmoji } from "../../emoji.js";
import { STATUS_PENDING, statusEmoji, statusLabel } from "./state.js";

export function rowWizardStaff() {
  return new ActionRowBuilder().addComponents(
    new UserSelectMenuBuilder()
      .setCustomId("rey:wizard:staff")
      .setPlaceholder("Selecciona los leones (staff) que participan...")
      .setMinValues(1)
      .setMaxValues(25),
  );
}

export function rowWizardActions() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("rey:wizard:start").setStyle(ButtonStyle.Success).setLabel("Iniciar").setEmoji("🚀"),
    new ButtonBuilder().setCustomId("rey:wizard:cancel").setStyle(ButtonStyle.Secondary).setLabel("Cancelar"),
  );
}

export function rowAccionesPanel(panelId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`rey:btn:iran:${panelId}`).setStyle(ButtonStyle.Success).setLabel("Irán").setEmoji("✅"),
    new ButtonBuilder().setCustomId(`rey:btn:noiran:${panelId}`).setStyle(ButtonStyle.Danger).setLabel("No iran").setEmoji("🚫"),
    new ButtonBuilder().setCustomId(`rey:btn:tepeada:${panelId}`).setStyle(ButtonStyle.Primary).setLabel("Tepeada").setEmoji("💢"),
  );
}

export function rowControlesPanel(panelId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`rey:addleon:${panelId}`).setStyle(ButtonStyle.Secondary).setLabel("Agregar León").setEmoji("🦁"),
    new ButtonBuilder().setCustomId(`rey:delleon:${panelId}`).setStyle(ButtonStyle.Secondary).setLabel("Eliminar León").setEmoji("🚷"),
    new ButtonBuilder().setCustomId(`rey:end:${panelId}`).setStyle(ButtonStyle.Success).setLabel("Finalizar evento").setEmoji("🏁"),
    new ButtonBuilder().setCustomId(`rey:cancel:${panelId}`).setStyle(ButtonStyle.Danger).setLabel("Cancelar evento").setEmoji("🛑"),
  );
}

export function panelComponents(panelId) {
  return [rowAccionesPanel(panelId), rowControlesPanel(panelId)];
}

// Selector ephemeral con las sedes del usuario, distinto por acción.
export function rowSelectorPrivado(panelId, leon, action) {
  const sel = new StringSelectMenuBuilder()
    .setCustomId(`rey:apply:${action}:${panelId}`)
    .setPlaceholder("Selecciona una de tus sedes...")
    .setMinValues(1)
    .setMaxValues(1);

  const opts = leon.sedes.slice(0, 25).map((s, i) => {
    const opt = {
      label: `${s.sede.name} — ${statusLabel(s.status)}`.slice(0, 100),
      value: String(i),
      description: s.razon ? `Razón actual: ${s.razon}`.slice(0, 100) : undefined,
    };
    if (s.status !== STATUS_PENDING) {
      opt.emoji = statusEmoji(s.status);
    } else {
      const e = parseEmoji(s.sede.emoji);
      if (e) opt.emoji = e;
      else   opt.emoji = "⏳";
    }
    return opt;
  });
  sel.addOptions(opts);
  return new ActionRowBuilder().addComponents(sel);
}
