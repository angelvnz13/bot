// Componentes (rows de botones y selects) del asalto.
// Como el repo de DB es asíncrono, las funciones que necesitan listar sedes o
// lugares reciben los datos pre-cargados (las llamadas async se hacen en wizard).

import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  UserSelectMenuBuilder,
} from "discord.js";

import { listBattleGrounds, listSedes } from "../../db.js";
import { parseEmoji } from "../../emoji.js";
import { bandosParaRonda, hayEmpateFinal } from "./state.js";

// --- Helpers de opciones --------------------------------------------------
function bgOptions(bgs) {
  if (!bgs.length) return [{ label: "(sin lugares)", value: "0" }];
  return bgs.slice(0, 25).map((b) => {
    const desc = b.info ? `${b.info}`.slice(0, 100) : `def: ${b.coords_def.slice(0, 30)}`.slice(0, 100);
    return {
      label: b.name.slice(0, 100),
      value: String(b.id),
      description: desc,
      emoji: "📍",
    };
  });
}

function sedeOptions(sedes, excludeId = null) {
  const filtered = sedes.filter((s) => s.id !== excludeId);
  if (!filtered.length) return [{ label: "(sin sedes)", value: "0" }];
  return filtered.slice(0, 25).map((s) => {
    const opt = { label: s.name.slice(0, 100), value: String(s.id) };
    if (s.coords) opt.description = s.coords.slice(0, 100);
    const e = parseEmoji(s.emoji);
    if (e) opt.emoji = e;
    return opt;
  });
}

// --- Wizard ---------------------------------------------------------------
export async function rowLugarSelect() {
  const bgs = await listBattleGrounds();
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("asalto:wizard:lugar")
      .setPlaceholder("Sede donde se enfrentan...")
      .addOptions(bgOptions(bgs)),
  );
}

export async function rowSedeDef() {
  const sedes = await listSedes();
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("asalto:wizard:def")
      .setPlaceholder("Sede que defiende 🛡️...")
      .addOptions(sedeOptions(sedes)),
  );
}

export async function rowSedeAtk(excludeId) {
  const sedes = await listSedes();
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("asalto:wizard:atk")
      .setPlaceholder("Sede que ataca ⚔️...")
      .addOptions(sedeOptions(sedes, excludeId)),
  );
}

export function rowStaff() {
  return new ActionRowBuilder().addComponents(
    new UserSelectMenuBuilder()
      .setCustomId("asalto:wizard:staff")
      .setPlaceholder("Leones (staff) que participan...")
      .setMinValues(1)
      .setMaxValues(25),
  );
}

export function rowIniciar() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("asalto:wizard:start").setStyle(ButtonStyle.Success).setLabel("Iniciar Asalto").setEmoji("🚀"),
    new ButtonBuilder().setCustomId("asalto:wizard:cancel").setStyle(ButtonStyle.Secondary).setLabel("Cancelar"),
  );
}

// --- Panel del asalto -----------------------------------------------------
export function rowPreInicio(messageId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`asalto:pre:start:${messageId}`).setStyle(ButtonStyle.Primary).setLabel("Iniciar Preparación (5 min)").setEmoji("⏳"),
    new ButtonBuilder().setCustomId(`asalto:prep:cancel:${messageId}`).setStyle(ButtonStyle.Danger).setLabel("Cancelar Evento").setEmoji("🛑"),
  );
}

export function rowPreparacion(messageId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`asalto:prep:start:${messageId}`).setStyle(ButtonStyle.Success).setLabel("Iniciar Ronda").setEmoji("▶️"),
    new ButtonBuilder().setCustomId(`asalto:prep:cancel:${messageId}`).setStyle(ButtonStyle.Danger).setLabel("Cancelar Evento").setEmoji("🛑"),
  );
}

export function rowRonda(state, messageId) {
  const { atk, dfn } = bandosParaRonda(state, state.currentRound);
  const atkBtn = new ButtonBuilder()
    .setCustomId(`asalto:ronda:gana:${messageId}:${atk.name}`)
    .setStyle(ButtonStyle.Success)
    .setLabel(`Gana ${atk.name}`.slice(0, 80));
  const dfnBtn = new ButtonBuilder()
    .setCustomId(`asalto:ronda:gana:${messageId}:${dfn.name}`)
    .setStyle(ButtonStyle.Success)
    .setLabel(`Gana ${dfn.name}`.slice(0, 80));

  atkBtn.setEmoji(parseEmoji(atk.emoji) ?? "⚔️");
  dfnBtn.setEmoji(parseEmoji(dfn.emoji) ?? "🛡️");

  return new ActionRowBuilder().addComponents(
    atkBtn,
    dfnBtn,
    new ButtonBuilder().setCustomId(`asalto:ronda:undo:${messageId}`).setStyle(ButtonStyle.Secondary).setLabel("Deshacer Ronda").setEmoji("↩️"),
    new ButtonBuilder().setCustomId(`asalto:ronda:cancel:${messageId}`).setStyle(ButtonStyle.Danger).setLabel("Cancelar Evento").setEmoji("🛑"),
  );
}

export function rowResultadoRonda(state, messageId) {
  const rows = [rowRonda(state, messageId)];
  const progress = new ActionRowBuilder();
  if (state.currentRound < 2) {
    progress.addComponents(
      new ButtonBuilder().setCustomId(`asalto:res:next:${messageId}`).setStyle(ButtonStyle.Primary).setLabel("Iniciar Ronda").setEmoji("▶️"),
    );
  } else if (hayEmpateFinal(state)) {
    progress.addComponents(
      new ButtonBuilder().setCustomId(`asalto:res:tie:${messageId}`).setStyle(ButtonStyle.Primary).setLabel("Anunciar Empate").setEmoji("📊"),
      new ButtonBuilder().setCustomId(`asalto:res:tiebreak:${messageId}`).setStyle(ButtonStyle.Success).setLabel("Iniciar Desempate").setEmoji("⚔️"),
    );
  } else {
    progress.addComponents(
      new ButtonBuilder().setCustomId(`asalto:res:end:${messageId}`).setStyle(ButtonStyle.Success).setLabel("Finalizar Evento").setEmoji("🏁"),
    );
  }
  if (progress.components.length) rows.push(progress);
  return rows;
}

export function rowDesempate(state, messageId) {
  const atkBtn = new ButtonBuilder()
    .setCustomId(`asalto:tb:gana:${messageId}:${state.sedeAtk.name}`)
    .setStyle(ButtonStyle.Success)
    .setLabel(`Gana ${state.sedeAtk.name}`.slice(0, 80));
  const dfnBtn = new ButtonBuilder()
    .setCustomId(`asalto:tb:gana:${messageId}:${state.sedeDef.name}`)
    .setStyle(ButtonStyle.Success)
    .setLabel(`Gana ${state.sedeDef.name}`.slice(0, 80));
  atkBtn.setEmoji(parseEmoji(state.sedeAtk.emoji) ?? "🏆");
  dfnBtn.setEmoji(parseEmoji(state.sedeDef.emoji) ?? "🏆");
  return new ActionRowBuilder().addComponents(
    atkBtn,
    dfnBtn,
    new ButtonBuilder().setCustomId(`asalto:ronda:cancel:${messageId}`).setStyle(ButtonStyle.Danger).setLabel("Cancelar Evento").setEmoji("🛑"),
  );
}
