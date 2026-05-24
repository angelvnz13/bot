// Todos los embeds del asalto (setup, aviso, ronda, fin, resumen, etc.)

import { EmbedBuilder } from "discord.js";

import { bandosParaRonda, hayEmpateFinal, marcadorStr, staffMentions } from "./state.js";
import { bgStr, sedeStr } from "./format.js";

// Bloque común para mostrar siempre quién defiende y quién ataca con sus
// coordenadas + las del lugar de enfrentamiento, todas en bloque de código
// (botón de copiar de Discord).
function bandosBlock(state) {
  const lines = [];
  const def = state.sedeDef;
  const atk = state.sedeAtk;
  const bg  = state.battleground;

  lines.push("**━━━━━━ ⚔️ BANDOS ━━━━━━**");
  if (def) {
    lines.push(`🛡️ **Defiende:** ${sedeStr(def)}`);
    if (def.coords) lines.push(`\`\`\`${def.coords}\`\`\``);
  }
  if (atk) {
    lines.push(`⚔️ **Ataca:** ${sedeStr(atk)}`);
    if (atk.coords) lines.push(`\`\`\`${atk.coords}\`\`\``);
  }
  if (bg) {
    lines.push(`📍 **Lugar:** ${bgStr(bg)}`);
    if (bg.coords_def) {
      lines.push(`Coords de defensa:`, `\`\`\`${bg.coords_def}\`\`\``);
    }
    if (bg.coords_atk) {
      lines.push(`Coords de ataque:`, `\`\`\`${bg.coords_atk}\`\`\``);
    }
  }
  lines.push("**━━━━━━━━━━━━━━━━━━━━━**");
  return lines.join("\n");
}

export function buildSetupEmbed(state, paso) {
  return new EmbedBuilder()
    .setTitle("🏰 Configurar Asalto a Sede")
    .setDescription(`**Paso actual:** ${paso}`)
    .setColor(0x5865f2)
    .addFields(
      { name: "📍 Sede del enfrentamiento", value: bgStr(state.battleground) },
      { name: "🛡️ Defiende", value: sedeStr(state.sedeDef), inline: true },
      { name: "⚔️ Ataca", value: sedeStr(state.sedeAtk), inline: true },
      { name: "🦁 Leones (staff)", value: staffMentions(state) },
    );
}

export function buildPreInicioEmbed(state) {
  return new EmbedBuilder()
    .setTitle(`⚔️ ${state.sedeAtk.name} vs ${state.sedeDef.name} 🛡️`)
    .setColor(0x5865f2)
    .setDescription(bandosBlock(state))
    .addFields({ name: "🦁 Leones (staff)", value: staffMentions(state) });
}

export function buildAvisoEmbed(state) {
  const head =
    `⚔️ **ENFRENTAMIENTO:** ${state.sedeAtk.name} vs ${state.sedeDef.name}`;
  const bandos = bandosBlock(state);
  return new EmbedBuilder()
    .setTitle("⏳ [AVISO] 5 MINUTOS PARA PREPARARSE")
    .setColor(0xe67e22)
    .setDescription(`${bandos}\n\n${head}`);
}

export function buildAviso3MinEmbed(state) {
  const head =
    `⚔️ **ENFRENTAMIENTO:** ${state.sedeAtk.name} vs ${state.sedeDef.name}`;
  const bandos = bandosBlock(state);
  return new EmbedBuilder()
    .setTitle("⏳ [AVISO] 3 MINUTOS PARA PREPARARSE")
    .setColor(0xc0392b)
    .setDescription(`${bandos}\n\n${head}`);
}

export function buildRondaInicioEmbed(state, ronda) {
  const { atk, dfn } = bandosParaRonda(state, ronda);
  const lines = [
    bandosBlock(state),
    "",
    `🔄 **Esta ronda**`,
    `🛡️ **DEF:** ${sedeStr(dfn)}`,
    `⚔️ **ATK:** ${sedeStr(atk)}`,
    "",
    "⚠️ ¡FUEGO! 💥🔫",
  ];

  return new EmbedBuilder()
    .setTitle(`🔥 [INICIO DE RONDA ${ronda}]`)
    .setColor(0xed4245)
    .setDescription(lines.join("\n"))
    .setFooter({
      text: `Marcador: ${state.sedeAtk.name} ${state.score[state.sedeAtk.name] ?? 0} - ${state.score[state.sedeDef.name] ?? 0} ${state.sedeDef.name}`,
    });
}

// Texto plano de la ronda actual, pensado para enviarse en un bloque ```
// debajo del embed: una sola línea por sección, con coords copiables.
export function buildRondaCopyText(state, ronda) {
  const { atk, dfn } = bandosParaRonda(state, ronda);
  return [
    `[INICIO DE RONDA ${ronda}]`,
    `DEF: ${dfn.name}`,
    `ATK: ${atk.name}`,
    "",
    "¡FUEGO!",
  ].join("\n");
}

export function buildRondaFinEmbed(state, ronda, ganador) {
  return new EmbedBuilder()
    .setTitle(`🔥 ¡RONDA ${ronda} FINALIZADA!`)
    .setColor(0xf1c40f)
    .setDescription(
      `${bandosBlock(state)}\n\n` +
      `🏆 **Ganador de la Ronda:** ${ganador}\n` +
      `📈 **Marcador Global:** ${marcadorStr(state)}\n\n` +
      `🔁 **Cambio de bandos** para la siguiente ronda.`
    );
}

export function buildEmpateEmbed(state) {
  return new EmbedBuilder()
    .setTitle("🔥 ¡RONDA 2 FINALIZADA!")
    .setColor(0x9b59b6)
    .setDescription(
      `${bandosBlock(state)}\n\n` +
      `⚔️ **${state.sedeAtk.name} ${state.score[state.sedeAtk.name]} VS ${state.score[state.sedeDef.name]} ${state.sedeDef.name}** ⚔️\n\n` +
      `📊 El enfrentamiento se encuentra en empate momentáneo.\n` +
      `📢 Para definir el desempate, se solicita que los líderes de ambas sedes se presenten en el centro.`
    );
}

export function buildFinalEmbed(state, ganador) {
  return new EmbedBuilder()
    .setTitle("🏆 ASALTO FINALIZADO")
    .setColor(0x2ecc71)
    .setDescription(
      `${bandosBlock(state)}\n\n` +
      `**Ganador:** ${ganador}\n📈 Marcador final: ${marcadorStr(state)}`
    );
}

export function buildCanceladoEmbed(state) {
  const desc =
    state.sedeAtk && state.sedeDef
      ? `El asalto entre **${state.sedeAtk.name}** y **${state.sedeDef.name}** fue cancelado.`
      : "El asalto fue cancelado.";
  return new EmbedBuilder().setTitle("🛑 EVENTO CANCELADO").setColor(0x95a5a6).setDescription(desc);
}

export function buildResumenEmbed(state, { cancelado, ganador }) {
  const embed = new EmbedBuilder()
    .setTitle(cancelado ? "🛑 ASALTO CANCELADO" : "🏆 ASALTO FINALIZADO")
    .setColor(cancelado ? 0x95a5a6 : 0x2ecc71);

  if (state.battleground) embed.addFields({ name: "📍 Sede del enfrentamiento", value: bgStr(state.battleground) });
  if (state.sedeAtk && state.sedeDef) {
    embed.addFields(
      { name: "⚔️ Atacante inicial", value: sedeStr(state.sedeAtk), inline: true },
      { name: "🛡️ Defensor inicial", value: sedeStr(state.sedeDef), inline: true },
    );
    if (state.score && Object.keys(state.score).length) {
      embed.addFields({ name: "📈 Marcador final", value: marcadorStr(state) });
    }
  }
  if (ganador && !cancelado) embed.addFields({ name: "🥇 Ganador", value: ganador });

  if (state.history.length) {
    const lineas = state.history.map((h) =>
      h.atk && h.dfn
        ? `**Ronda ${h.ronda}** — ⚔️ ${h.atk} vs 🛡️ ${h.dfn} → 🏆 ${h.ganador}`
        : `**Ronda ${h.ronda}** (desempate) → 🏆 ${h.ganador}`
    );
    embed.addFields({ name: "📜 Historial de rondas", value: lineas.join("\n") });
  }
  embed.addFields({ name: "🦁 Leones (staff)", value: staffMentions(state) });
  return embed;
}

// hayEmpateFinal se reexporta desde state.js — no lo redefinimos aquí.
export { hayEmpateFinal };
