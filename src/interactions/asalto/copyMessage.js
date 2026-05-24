// Mensaje "copiable" del asalto: un único mensaje al lado del panel principal
// que se va actualizando en cada cambio de estado.
//
// Contenido: bloque ``` con el texto plano de la ronda actual o del estado
// final del evento, listo para copiar y pegar de un toque.

import { logger } from "../../logger.js";
import { bandosParaRonda } from "./state.js";

function compactName(name) {
  // Quita espacios para que el texto copiable sea una sola línea limpia.
  return String(name ?? "").replace(/\s+/g, "");
}

function bloque(text) {
  // El triple backtick activa el botón "Copy" de Discord. Los emojis Unicode
  // se renderizan dentro del bloque, los custom no.
  return "```\n" + text + "\n```";
}

function rondaText(state, ronda) {
  const { atk, dfn } = bandosParaRonda(state, ronda);
  return `🔥 [INICIO DE RONDA ${ronda}] · 🛡️ DEF: ${compactName(dfn.name)} · ⚔️ ATK: ${compactName(atk.name)} · ⚠️ ¡FUEGO! 💥🔫`;
}

function rondaFinText(state, ronda, ganador) {
  const score = `${compactName(state.sedeAtk.name)} ${state.score[state.sedeAtk.name] ?? 0} - ${state.score[state.sedeDef.name] ?? 0} ${compactName(state.sedeDef.name)}`;
  return `🔥 [RONDA ${ronda} FINALIZADA] · 🏆 ${compactName(ganador)} · 📈 ${score}`;
}

function empateText(state) {
  const score = `${compactName(state.sedeAtk.name)} ${state.score[state.sedeAtk.name] ?? 0} - ${state.score[state.sedeDef.name] ?? 0} ${compactName(state.sedeDef.name)}`;
  return `🔥 [RONDA 2 FINALIZADA] · 📊 EMPATE · ${score} · 📢 Líderes al centro`;
}

function desempateText(state) {
  return `⚔️ [RONDA DE DESEMPATE] · ${compactName(state.sedeAtk.name)} VS ${compactName(state.sedeDef.name)} · ⚠️ ¡FUEGO! 💥🔫`;
}

function finalText(state, ganador) {
  const score = `${compactName(state.sedeAtk.name)} ${state.score[state.sedeAtk.name] ?? 0} - ${state.score[state.sedeDef.name] ?? 0} ${compactName(state.sedeDef.name)}`;
  return `🏆 [ASALTO FINALIZADO] · Ganador: ${compactName(ganador)} · 📈 ${score}`;
}

function canceladoText(state) {
  if (state.sedeAtk && state.sedeDef) {
    return `🛑 [ASALTO CANCELADO] · ${compactName(state.sedeAtk.name)} vs ${compactName(state.sedeDef.name)}`;
  }
  return "🛑 [ASALTO CANCELADO]";
}

// ---------------------------------------------------------------------------
// API pública
// ---------------------------------------------------------------------------

/**
 * Crea o actualiza el mensaje copiable del asalto en el canal privado.
 * - Si state.copyMessageId no existe, lo publica.
 * - Si ya existe, lo edita.
 */
async function ensureCopyMessage(client, state, content) {
  if (!state.privateChannelId) return;
  try {
    const channel = await client.channels.fetch(state.privateChannelId);
    if (!channel?.isTextBased?.()) return;

    if (state.copyMessageId) {
      const msg = await channel.messages.fetch(state.copyMessageId).catch(() => null);
      if (msg) {
        await msg.edit({ content, allowedMentions: { parse: [] } });
        return;
      }
      // Mensaje borrado: cae a publicar uno nuevo.
    }
    const sent = await channel.send({ content, allowedMentions: { parse: [] } });
    state.copyMessageId = sent.id;
  } catch (e) {
    logger.warn("asalto.copyMessage.failed", { err: e.message });
  }
}

export function notifyRondaStart(client, state, ronda) {
  return ensureCopyMessage(client, state, bloque(rondaText(state, ronda)));
}

export function notifyRondaFin(client, state, ronda, ganador) {
  return ensureCopyMessage(client, state, bloque(rondaFinText(state, ronda, ganador)));
}

export function notifyEmpate(client, state) {
  return ensureCopyMessage(client, state, bloque(empateText(state)));
}

export function notifyDesempate(client, state) {
  return ensureCopyMessage(client, state, bloque(desempateText(state)));
}

export function notifyFinal(client, state, ganador) {
  return ensureCopyMessage(client, state, bloque(finalText(state, ganador)));
}

export function notifyCancelado(client, state) {
  return ensureCopyMessage(client, state, bloque(canceladoText(state)));
}
