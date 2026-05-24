// Agregar / Eliminar leones en caliente con redistribución de sedes.

import {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  UserSelectMenuBuilder,
} from "discord.js";

import { audit } from "../../audit.js";
import { logger } from "../../logger.js";
import { isAdmin } from "../../permissions.js";

import { STATUS_PENDING, reyes, shuffle } from "./state.js";
import { refreshPanel } from "./refresh.js";

// --- Agregar -------------------------------------------------------------
export async function btnAddLeon(interaction, panelId) {
  const state = reyes.get(panelId);
  if (!state) return interaction.reply({ content: "⚠️ Este evento ya no está activo.", ephemeral: true });

  if (interaction.user.id !== state.ownerId && !(await isAdmin(interaction.member))) {
    return interaction.reply({
      content: "🚫 Solo el creador del evento o un administrador puede agregar leones.",
      ephemeral: true,
    });
  }

  const select = new UserSelectMenuBuilder()
    .setCustomId(`rey:addselect:${panelId}`)
    .setPlaceholder("Selecciona el león a añadir...")
    .setMinValues(1)
    .setMaxValues(1);

  await interaction.reply({
    content: "🦁 Selecciona al usuario que se incorpora. Las sedes pendientes se redistribuirán entre todos.",
    components: [new ActionRowBuilder().addComponents(select)],
    ephemeral: true,
  });
}

export async function addLeonSelect(interaction, panelId) {
  const state = reyes.get(panelId);
  if (!state) return interaction.update({ content: "⚠️ Este evento ya no está activo.", components: [] });

  if (interaction.user.id !== state.ownerId && !(await isAdmin(interaction.member))) {
    return interaction.update({
      content: "🚫 Solo el creador del evento o un administrador puede agregar leones.",
      components: [],
    });
  }

  const newUserId = interaction.values[0];
  if (state.leones.some((l) => l.userId === newUserId)) {
    return interaction.update({
      content: `ℹ️ <@${newUserId}> ya forma parte del evento.`,
      components: [],
    });
  }

  // Dar acceso al canal privado
  try {
    const guild = interaction.guild;
    const canal = guild.channels.cache.get(state.privateChannelId)
      ?? await guild.channels.fetch(state.privateChannelId).catch(() => null);
    if (canal) {
      await canal.permissionOverwrites.edit(newUserId, {
        ViewChannel: true,
        SendMessages: true,
        ReadMessageHistory: true,
      });
    }
  } catch (e) {
    logger.warn("rey.addLeon.permsFailed", { err: e.message });
  }

  // Recolectar sedes pendientes (las decididas se mantienen con su dueño)
  const pendientes = [];
  for (const leon of state.leones) {
    leon.sedes = leon.sedes.filter((s) => {
      if (s.status === STATUS_PENDING) {
        pendientes.push(s.sede);
        return false;
      }
      return true;
    });
  }

  state.leones.push({ userId: newUserId, sedes: [] });

  // Reparto: dárselas a quien menos sedes tiene en cada paso.
  const sedesShuf = shuffle(pendientes);
  for (const sedeObj of sedesShuf) {
    state.leones.sort((a, b) => a.sedes.length - b.sedes.length);
    state.leones[0].sedes.push({
      sede: sedeObj,
      status: STATUS_PENDING,
      razon: null,
    });
  }

  audit("rey.addLeon", {
    userId: interaction.user.id,
    panelId,
    addedUserId: newUserId,
    redistributed: pendientes.length,
  });

  await interaction.update({
    content: `✅ <@${newUserId}> añadido. Se redistribuyeron **${pendientes.length}** sedes pendientes.`,
    components: [],
  });
  await refreshPanel(interaction.client, state);
}

// --- Eliminar ------------------------------------------------------------
export async function btnDelLeon(interaction, panelId) {
  const state = reyes.get(panelId);
  if (!state) return interaction.reply({ content: "⚠️ Este evento ya no está activo.", ephemeral: true });

  if (interaction.user.id !== state.ownerId && !(await isAdmin(interaction.member))) {
    return interaction.reply({
      content: "🚫 Solo el creador del evento o un administrador puede eliminar leones.",
      ephemeral: true,
    });
  }
  if (state.leones.length <= 1) {
    return interaction.reply({
      content: "⚠️ No puedes eliminar al único león restante. Usa **Cancelar evento** si quieres cerrarlo.",
      ephemeral: true,
    });
  }

  const select = new StringSelectMenuBuilder()
    .setCustomId(`rey:delselect:${panelId}`)
    .setPlaceholder("Selecciona el león a eliminar...")
    .setMinValues(1)
    .setMaxValues(1)
    .addOptions(
      state.leones.map((l, i) => ({
        label: `Usuario ${l.userId.slice(-4)}`,
        value: String(i),
        description: `${l.sedes.length} sede(s) asignadas`,
      })),
    );

  await interaction.reply({
    content: "🚷 Selecciona al león a eliminar. Sus sedes se redistribuirán entre el resto manteniendo su estado actual.",
    components: [new ActionRowBuilder().addComponents(select)],
    ephemeral: true,
  });
}

export async function delLeonSelect(interaction, panelId) {
  const state = reyes.get(panelId);
  if (!state) return interaction.update({ content: "⚠️ Este evento ya no está activo.", components: [] });

  if (interaction.user.id !== state.ownerId && !(await isAdmin(interaction.member))) {
    return interaction.update({
      content: "🚫 Solo el creador del evento o un administrador puede eliminar leones.",
      components: [],
    });
  }

  const idx = Number(interaction.values[0]);
  const removed = state.leones[idx];
  if (!removed) {
    return interaction.update({ content: "⚠️ León no encontrado.", components: [] });
  }
  if (state.leones.length <= 1) {
    return interaction.update({
      content: "⚠️ No puedes eliminar al único león restante.",
      components: [],
    });
  }

  // Sus sedes (todas, con su estado actual) se redistribuyen al resto.
  const sedesAReasignar = removed.sedes;
  state.leones.splice(idx, 1);

  // Reparto: dárselas a quien menos sedes tiene en cada paso.
  const shuf = shuffle(sedesAReasignar);
  for (const item of shuf) {
    state.leones.sort((a, b) => a.sedes.length - b.sedes.length);
    state.leones[0].sedes.push(item); // mantiene status y razon
  }

  // Quitar acceso al canal (excepto al creador)
  try {
    const guild = interaction.guild;
    const canal = guild.channels.cache.get(state.privateChannelId)
      ?? await guild.channels.fetch(state.privateChannelId).catch(() => null);
    if (canal && removed.userId !== state.ownerId) {
      await canal.permissionOverwrites.delete(removed.userId).catch(() => {});
    }
  } catch (e) {
    logger.warn("rey.delLeon.permsFailed", { err: e.message });
  }

  audit("rey.delLeon", {
    userId: interaction.user.id,
    panelId,
    removedUserId: removed.userId,
    redistributed: sedesAReasignar.length,
  });

  await interaction.update({
    content: `✅ <@${removed.userId}> eliminado del evento. Se redistribuyeron **${sedesAReasignar.length}** sedes.`,
    components: [],
  });
  await refreshPanel(interaction.client, state);
}
