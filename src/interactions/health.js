// /health: muestra métricas, uptime y memoria.

import { EmbedBuilder } from "discord.js";

import { snapshot } from "../metrics.js";
import { ensureAdmin } from "../permissions.js";
import { countSedes } from "../db.js";

function fmtMB(bytes) {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function fmtUptime(sec) {
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${d}d ${h}h ${m}m ${s}s`;
}

export async function replyHealth(interaction) {
  if (!(await ensureAdmin(interaction))) return;
  const snap = snapshot();
  const sedesCount = await countSedes();

  const counters = Object.entries(snap.counters)
    .map(([k, v]) => `\`${k}\`: ${v}`)
    .join("\n") || "_sin datos_";

  const timings = Object.entries(snap.timings)
    .map(([k, v]) => `\`${k}\`: avg ${v.avgMs.toFixed(1)}ms / max ${v.maxMs.toFixed(0)}ms (${v.count})`)
    .join("\n") || "_sin datos_";

  const embed = new EmbedBuilder()
    .setTitle("🩺 Estado del bot")
    .setColor(0x2ecc71)
    .addFields(
      { name: "Uptime", value: fmtUptime(snap.uptimeSec), inline: true },
      { name: "Memoria RSS", value: fmtMB(snap.rss), inline: true },
      { name: "Heap", value: fmtMB(snap.heapUsed), inline: true },
      { name: "Sedes registradas", value: String(sedesCount), inline: true },
      { name: "Latencia API", value: `${interaction.client.ws.ping} ms`, inline: true },
      { name: "Contadores", value: counters.slice(0, 1024) },
      { name: "Tiempos", value: timings.slice(0, 1024) },
    );

  await interaction.reply({ embeds: [embed], ephemeral: true });
}
