// Handlers del flujo /set: panel, modal, solicitud y aprobación.

import { audit } from "../../audit.js";
import { logger } from "../../logger.js";

import {
  ALL_RANK_ROLE_IDS,
  RANK_BY_KEY,
  buildNickname,
} from "./ranks.js";
import {
  buildPanelEmbed,
  buildRechazoModal,
  buildSolicitudEmbed,
  buildVerificarModal,
  rowRangoSelect,
  rowSolicitudActions,
  rowVerificarse,
} from "./components.js";
import {
  SET_APPROVER_ROLE_IDS,
  SET_REQUESTS_CHANNEL_ID,
} from "./config.js";
import {
  createRequest,
  deleteRequest,
  getRequest,
  saveRequest,
} from "./requests.js";
import { sanitizeIcid, sanitizeNombre } from "./sanitize.js";
import { deleteSession, getSession, setSession } from "./state.js";

// /set → panel visible para todos en el canal
export async function replySet(interaction) {
  await interaction.reply({
    embeds: [buildPanelEmbed()],
    components: [rowVerificarse()],
  });
}

// Botón "Verificarse" → abre modal
export async function btnVerify(interaction) {
  await interaction.showModal(buildVerificarModal());
}

// Modal submit → guarda nombre+ICID y muestra el selector de rango
export async function modalVerify(interaction) {
  let nombre, icid;
  try {
    nombre = sanitizeNombre(interaction.fields.getTextInputValue("nombre"));
    icid   = sanitizeIcid(interaction.fields.getTextInputValue("icid"));
  } catch (e) {
    return interaction.reply({ content: `❌ ${e.message}`, flags: 64 });
  }

  setSession(interaction.user.id, { nombre, icid });

  await interaction.reply({
    content: `📋 Datos recibidos: **${nombre}** · ICID **${icid}**\nElige tu rango:`,
    components: [rowRangoSelect()],
    flags: 64,
  });
}

// Select de rango → publica la solicitud en el canal de revisión
export async function selectRango(interaction) {
  const session = getSession(interaction.user.id);
  if (!session) {
    return interaction.update({
      content: "⚠️ La sesión expiró. Vuelve a ejecutar `/set`.",
      components: [],
    });
  }

  const key = interaction.values[0];
  const rank = RANK_BY_KEY[key];
  if (!rank) {
    return interaction.update({ content: "❌ Rango inválido.", components: [] });
  }

  const guild = interaction.guild;
  if (!guild) {
    return interaction.update({ content: "❌ Solo funciona en un servidor.", components: [] });
  }

  const reviewChannel = guild.channels.cache.get(SET_REQUESTS_CHANNEL_ID)
    ?? await guild.channels.fetch(SET_REQUESTS_CHANNEL_ID).catch(() => null);
  if (!reviewChannel?.isTextBased?.()) {
    return interaction.update({
      content: `❌ No encontré el canal de solicitudes (\`${SET_REQUESTS_CHANNEL_ID}\`).`,
      components: [],
    });
  }

  // Publicamos placeholder para conocer el messageId.
  const req = createRequest({
    userId: interaction.user.id,
    rankKey: rank.key,
    nombre: session.nombre,
    icid: session.icid,
  });

  let msg;
  try {
    msg = await reviewChannel.send({
      content: `${SET_APPROVER_ROLE_IDS.map((id) => `<@&${id}>`).join(" ")} nueva solicitud de verificación`,
      embeds: [buildSolicitudEmbed({
        userId: req.userId,
        rank,
        nombre: req.nombre,
        icid: req.icid,
        status: "pending",
      })],
      allowedMentions: { roles: SET_APPROVER_ROLE_IDS, parse: [] },
    });
  } catch (e) {
    return interaction.update({
      content: `❌ No pude publicar la solicitud: \`${e.message}\``,
      components: [],
    });
  }

  // Adjuntamos los botones con el messageId real.
  await msg.edit({ components: [rowSolicitudActions(msg.id)] }).catch(() => {});
  saveRequest(msg.id, req);
  deleteSession(interaction.user.id);

  audit("set.request", {
    userId: interaction.user.id,
    guildId: guild.id,
    rank: rank.key,
    nombre: req.nombre,
    icid: req.icid,
    requestMessageId: msg.id,
  });

  await interaction.update({
    content: "📤 Solicitud enviada. Un Auxiliar la revisará y te asignará el rol cuando se apruebe.",
    components: [],
  });
}

// --- Aprobación / Rechazo (solo roles aprobadores) ----------------------
function isApprover(member) {
  if (!member?.roles?.cache) return false;
  return SET_APPROVER_ROLE_IDS.some((id) => member.roles.cache.has(id));
}

async function ensureApprover(interaction) {
  if (isApprover(interaction.member)) return true;
  await interaction.reply({
    content: "🚫 No tienes permiso para aprobar o rechazar solicitudes.",
    flags: 64,
  });
  return false;
}

// Aprueba la solicitud: aplica rol y nick al solicitante.
export async function btnApprove(interaction, requestMessageId) {
  if (!(await ensureApprover(interaction))) return;

  const req = getRequest(requestMessageId);
  if (!req) {
    return interaction.reply({
      content: "⚠️ Esta solicitud ya no está activa o el bot fue reiniciado.",
      flags: 64,
    });
  }
  if (req.status !== "pending") {
    return interaction.reply({
      content: `⚠️ Esta solicitud ya fue ${req.status === "approved" ? "aprobada" : "rechazada"}.`,
      flags: 64,
    });
  }

  const rank = RANK_BY_KEY[req.rankKey];
  if (!rank) {
    return interaction.reply({ content: "❌ Rango inválido en la solicitud.", flags: 64 });
  }

  const guild = interaction.guild;
  const me = guild.members.me;
  if (!me?.permissions.has("ManageRoles")) {
    return interaction.reply({ content: "❌ El bot no tiene permiso **Gestionar roles**.", flags: 64 });
  }
  if (!me?.permissions.has("ManageNicknames")) {
    return interaction.reply({ content: "❌ El bot no tiene permiso **Gestionar apodos**.", flags: 64 });
  }

  const member = await guild.members.fetch(req.userId).catch(() => null);
  if (!member) {
    return interaction.reply({ content: "❌ No encontré al solicitante en el servidor.", flags: 64 });
  }

  const targetRole = guild.roles.cache.get(rank.roleId)
    ?? await guild.roles.fetch(rank.roleId).catch(() => null);
  if (!targetRole) {
    return interaction.reply({
      content: `❌ El rol del rango **${rank.label}** no existe.`,
      flags: 64,
    });
  }
  if (me.roles.highest.position <= targetRole.position) {
    return interaction.reply({
      content: `❌ El rol del bot está por debajo de **${rank.label}**. Pide a un admin que lo suba.`,
      flags: 64,
    });
  }

  // Quitar TODOS los rangos previos y poner el nuevo
  const toRemove = ALL_RANK_ROLE_IDS.filter((id) => member.roles.cache.has(id));
  try {
    if (toRemove.length) await member.roles.remove(toRemove, "Cambio de rango (/set)");
    await member.roles.add(rank.roleId, "Asignación de rango (/set)");
  } catch (e) {
    return interaction.reply({
      content: `❌ Error al asignar el rol: \`${e.message}\``,
      flags: 64,
    });
  }

  const nick = buildNickname({ prefix: rank.prefix, nombre: req.nombre, icid: req.icid });
  let nickError = null;
  try {
    await member.setNickname(nick, "Verificación aprobada (/set)");
  } catch (e) {
    nickError = e.message;
    logger.warn("set.setNickname.failed", { userId: member.id, err: e.message });
  }

  req.status = "approved";
  req.decidedBy = interaction.user.id;
  saveRequest(requestMessageId, req);

  audit("set.approve", {
    approverId: interaction.user.id,
    userId: member.id,
    guildId: guild.id,
    rank: rank.key,
    nombre: req.nombre,
    icid: req.icid,
    removedRoles: toRemove,
    nickError,
    requestMessageId,
  });

  await interaction.update({
    embeds: [buildSolicitudEmbed({
      userId: req.userId,
      rank,
      nombre: req.nombre,
      icid: req.icid,
      status: "approved",
      decidedBy: interaction.user.id,
    })],
    components: [],
  });
}

// Rechaza: abre modal pidiendo motivo.
export async function btnReject(interaction, requestMessageId) {
  if (!(await ensureApprover(interaction))) return;

  const req = getRequest(requestMessageId);
  if (!req) {
    return interaction.reply({
      content: "⚠️ Esta solicitud ya no está activa o el bot fue reiniciado.",
      flags: 64,
    });
  }
  if (req.status !== "pending") {
    return interaction.reply({
      content: `⚠️ Esta solicitud ya fue ${req.status === "approved" ? "aprobada" : "rechazada"}.`,
      flags: 64,
    });
  }

  await interaction.showModal(buildRechazoModal(requestMessageId));
}

export async function modalReject(interaction, requestMessageId) {
  if (!(await ensureApprover(interaction))) return;

  const req = getRequest(requestMessageId);
  if (!req || req.status !== "pending") {
    return interaction.reply({
      content: "⚠️ Esta solicitud ya no está activa.",
      flags: 64,
    });
  }

  const motivo = interaction.fields.getTextInputValue("motivo").trim().slice(0, 300);
  const rank = RANK_BY_KEY[req.rankKey];

  req.status = "rejected";
  req.decidedBy = interaction.user.id;
  req.motivo = motivo;
  saveRequest(requestMessageId, req);

  audit("set.reject", {
    approverId: interaction.user.id,
    userId: req.userId,
    guildId: interaction.guild?.id,
    rank: req.rankKey,
    motivo,
    requestMessageId,
  });

  // Editar el mensaje original de la solicitud
  try {
    const msg = await interaction.channel.messages.fetch(requestMessageId);
    await msg.edit({
      embeds: [buildSolicitudEmbed({
        userId: req.userId,
        rank,
        nombre: req.nombre,
        icid: req.icid,
        status: "rejected",
        decidedBy: interaction.user.id,
        motivo,
      })],
      components: [],
    });
  } catch (e) {
    logger.warn("set.reject.editFailed", { err: e.message });
  }

  await interaction.reply({ content: `🚫 Solicitud rechazada con motivo: ${motivo}`, flags: 64 });

  deleteRequest(requestMessageId);
}
