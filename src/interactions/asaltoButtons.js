// Manejadores de los botones del panel del asalto (después del wizard).

import { EmbedBuilder } from "discord.js";

import { getAsalto, touchAsalto } from "../state.js";
import { audit } from "../audit.js";

import {
  bandosParaRonda,
  buildAviso3MinEmbed,
  buildAvisoEmbed,
  buildCanceladoEmbed,
  buildEmpateEmbed,
  buildFinalEmbed,
  buildRondaFinEmbed,
  buildRondaInicioEmbed,
  cerrarAsalto,
  rowDesempate,
  rowPreparacion,
  rowResultadoRonda,
  rowRonda,
} from "./asalto.js";

import {
  notifyCancelado,
  notifyDesempate,
  notifyEmpate,
  notifyFinal,
  notifyRondaFin,
  notifyRondaStart,
} from "./asalto/copyMessage.js";

import { PREP_TIME_MS } from "../config.js";

function noState(interaction) {
  return interaction.reply({
    content: "⚠️ Este asalto ya no está activo.",
    flags: 64,
  });
}

// --- Pre-inicio: pulsado al terminar el wizard, arranca los 5 min --------

export async function preStart(interaction, messageId) {
  const state = getAsalto(messageId);
  if (!state) return noState(interaction);
  if (state.prepTimeout) clearTimeout(state.prepTimeout);

  await interaction.update({
    embeds: [buildAvisoEmbed(state)],
    components: [rowPreparacion(messageId)],
  });
  touchAsalto(messageId);
  audit("asalto.prep.start", { messageId, userId: interaction.user.id });

  // Tras 5 minutos: cambia el embed a "3 minutos" pero NO arranca la ronda.
  // El botón "Iniciar Ronda" se queda permanente esperando a que alguien lo pulse.
  state.prepTimeout = setTimeout(async () => {
    const s = getAsalto(messageId);
    if (!s || s.cancelled || s.currentRound > 0) return;
    touchAsalto(messageId);
    try {
      const channel = await interaction.client.channels.fetch(s.privateChannelId);
      const msg = await channel.messages.fetch(messageId);
      await msg.edit({
        embeds: [buildAviso3MinEmbed(s)],
        components: [rowPreparacion(messageId)],
      });
    } catch {
      // ignoramos
    }
    s.prepTimeout = null;
  }, PREP_TIME_MS);
}

// --- Preparación ---------------------------------------------------------

export async function prepStart(interaction, messageId) {
  const state = getAsalto(messageId);
  if (!state) return noState(interaction);
  if (state.prepTimeout) clearTimeout(state.prepTimeout);
  state.currentRound = 1;
  await interaction.update({
    embeds: [buildRondaInicioEmbed(state, 1)],
    components: [rowRonda(state, messageId)],
  });
  await notifyRondaStart(interaction.client, state, 1);
  touchAsalto(messageId);
  audit("asalto.round.start", { messageId, ronda: 1, userId: interaction.user.id });
}

export async function prepCancel(interaction, messageId) {
  const state = getAsalto(messageId);
  if (!state) return noState(interaction);
  if (state.prepTimeout) clearTimeout(state.prepTimeout);
  state.cancelled = true;
  await interaction.update({
    embeds: [buildCanceladoEmbed(state)],
    components: [],
  });
  await notifyCancelado(interaction.client, state);
  await cerrarAsalto(interaction, state, { cancelado: true, ganador: null });
}

// --- Ronda ----------------------------------------------------------------

export async function rondaGana(interaction, messageId, sedeName) {
  const state = getAsalto(messageId);
  if (!state) return noState(interaction);
  const { atk, dfn } = bandosParaRonda(state, state.currentRound);

  // Si ya hay un resultado registrado para esta ronda, lo reemplazamos
  // (corrección rápida sin tener que pulsar "Deshacer" primero).
  const last = state.history[state.history.length - 1];
  if (last && last.ronda === state.currentRound) {
    if (last.ganador === sedeName) {
      // Mismo ganador que ya estaba: no cambia nada, solo refrescamos el embed.
      await interaction.update({
        embeds: [buildRondaFinEmbed(state, state.currentRound, sedeName)],
        components: rowResultadoRonda(state, messageId),
      });
      await notifyRondaFin(interaction.client, state, state.currentRound, sedeName);
      return;
    }
    state.score[last.ganador] = Math.max(0, (state.score[last.ganador] ?? 0) - 1);
    state.history.pop();
  }

  state.score[sedeName] = (state.score[sedeName] ?? 0) + 1;
  state.history.push({
    ronda: state.currentRound,
    ganador: sedeName,
    atk: atk.name,
    dfn: dfn.name,
  });
  await interaction.update({
    embeds: [buildRondaFinEmbed(state, state.currentRound, sedeName)],
    components: rowResultadoRonda(state, messageId),
  });
  await notifyRondaFin(interaction.client, state, state.currentRound, sedeName);
  touchAsalto(messageId);
  audit("asalto.round.win", {
    messageId,
    userId: interaction.user.id,
    ronda: state.currentRound,
    sede: sedeName,
  });
}

export async function rondaUndo(interaction, messageId) {
  const state = getAsalto(messageId);
  if (!state) return noState(interaction);
  if (!state.history.length) {
    await interaction.reply({ content: "⚠️ No hay rondas previas para deshacer.", flags: 64 });
    return;
  }
  const last = state.history.pop();
  state.score[last.ganador] = Math.max(0, (state.score[last.ganador] ?? 0) - 1);
  state.currentRound = last.ronda;
  await interaction.update({
    embeds: [buildRondaInicioEmbed(state, last.ronda)],
    components: [rowRonda(state, messageId)],
  });
  await notifyRondaStart(interaction.client, state, last.ronda);
  touchAsalto(messageId);
  audit("asalto.round.undo", { messageId, userId: interaction.user.id, ronda: last.ronda });
}

export async function rondaCancel(interaction, messageId) {
  const state = getAsalto(messageId);
  if (!state) return noState(interaction);
  state.cancelled = true;
  await interaction.update({
    embeds: [buildCanceladoEmbed(state)],
    components: [],
  });
  await notifyCancelado(interaction.client, state);
  await cerrarAsalto(interaction, state, { cancelado: true, ganador: null });
}

// --- Resultado de ronda --------------------------------------------------

export async function resNext(interaction, messageId) {
  const state = getAsalto(messageId);
  if (!state) return noState(interaction);
  state.currentRound = 2;
  await interaction.update({
    embeds: [buildRondaInicioEmbed(state, 2)],
    components: [rowRonda(state, messageId)],
  });
  await notifyRondaStart(interaction.client, state, 2);
  touchAsalto(messageId);
  audit("asalto.round.start", { messageId, ronda: 2, userId: interaction.user.id });
}

export async function resTie(interaction, messageId) {
  const state = getAsalto(messageId);
  if (!state) return noState(interaction);
  await interaction.update({
    embeds: [buildEmpateEmbed(state)],
    components: [rowDesempate(state, messageId)],
  });
  await notifyEmpate(interaction.client, state);
}

export async function resTiebreak(interaction, messageId) {
  const state = getAsalto(messageId);
  if (!state) return noState(interaction);
  state.currentRound = 3;
  const embed = new EmbedBuilder()
    .setTitle("⚔️ RONDA DE DESEMPATE")
    .setColor(0xed4245)
    .setDescription(
      `📍 **SEDE:** Centro\n⚔️ ${state.sedeAtk.name} VS ${state.sedeDef.name}\n\n⚠️ ¡FUEGO! 💥🔫`,
    );
  await interaction.update({
    embeds: [embed],
    components: [rowDesempate(state, messageId)],
  });
  await notifyDesempate(interaction.client, state);
  touchAsalto(messageId);
  audit("asalto.round.start", { messageId, ronda: 3, userId: interaction.user.id });
}

export async function resEnd(interaction, messageId) {
  const state = getAsalto(messageId);
  if (!state) return noState(interaction);
  const ganador =
    (state.score[state.sedeAtk.name] ?? 0) > (state.score[state.sedeDef.name] ?? 0)
      ? state.sedeAtk.name
      : state.sedeDef.name;
  await interaction.update({
    embeds: [buildFinalEmbed(state, ganador)],
    components: [],
  });
  await notifyFinal(interaction.client, state, ganador);
  await cerrarAsalto(interaction, state, { cancelado: false, ganador });
}

// --- Desempate -----------------------------------------------------------

export async function tbGana(interaction, messageId, sedeName) {
  const state = getAsalto(messageId);
  if (!state) return noState(interaction);
  state.score[sedeName] = (state.score[sedeName] ?? 0) + 1;
  state.history.push({ ronda: 3, ganador: sedeName, atk: "", dfn: "" });
  await interaction.update({
    embeds: [buildFinalEmbed(state, sedeName)],
    components: [],
  });
  await notifyFinal(interaction.client, state, sedeName);
  await cerrarAsalto(interaction, state, { cancelado: false, ganador: sedeName });
}
