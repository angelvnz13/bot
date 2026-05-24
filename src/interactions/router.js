import { replyMenuEventos } from "./menu.js";
import {
  handleSedesButton,
  handleSedesConfirmDelete,
  handleSedesModalCreate,
  handleSedesModalEdit,
  handleSedesSelect,
  replySedesAdmin,
} from "./sedesAdmin.js";
import {
  handleLugaresButton,
  handleLugaresConfirmDelete,
  handleLugaresModalCreate,
  handleLugaresModalEdit,
  handleLugaresSelect,
  replyLugaresAdmin,
} from "./lugaresAdmin.js";
import {
  startWizard,
  wizardAtk,
  wizardCancel,
  wizardDef,
  wizardLugar,
  wizardStaff,
  wizardStart,
} from "./asalto.js";
import {
  prepCancel,
  prepStart,
  preStart,
  resEnd,
  resNext,
  resTie,
  resTiebreak,
  rondaCancel,
  rondaGana,
  rondaUndo,
  tbGana,
} from "./asaltoButtons.js";
import { handleConfigSelect, replyConfig } from "./config.js";
import { replyForgetMe } from "./privacy.js";
import { replyHealth } from "./health.js";
import { replyRanking, handleRankingViewButton } from "./ranking.js";
import * as setMod from "./set/index.js";
import * as rey from "./rey.js";

import { checkRate } from "../rateLimit.js";
import { logger } from "../logger.js";
import { inc, withTiming } from "../metrics.js";

function applyRateLimit(interaction) {
  const key = `${interaction.user.id}:${interaction.guildId ?? "dm"}`;
  const result = checkRate(key, { capacity: 10, refillPerSec: 2 });
  if (!result.ok) {
    if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
      interaction.reply({
        content: `⏱️ Vas muy rápido. Intenta de nuevo en ${result.retryAfterSec}s.`,
        ephemeral: true,
      }).catch(() => {});
    }
    inc("ratelimit.blocked");
    return false;
  }
  return true;
}

export async function handleInteraction(interaction) {
  if (!applyRateLimit(interaction)) return;

  return withTiming("interaction", async () => {
    try {
      await routeInteraction(interaction);
    } catch (err) {
      logger.error("router.exception", { err: err?.message, stack: err?.stack });
      inc("interaction.error");
      if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
        await interaction
          .reply({ content: `❌ Error inesperado: \`${err?.message ?? err}\``, ephemeral: true })
          .catch(() => {});
      }
    }
  });
}

async function routeInteraction(interaction) {
  // ----- Slash commands -------------------------------------------------
  if (interaction.isChatInputCommand()) {
    inc(`cmd.${interaction.commandName}`);
    if (interaction.commandName === "evento")    return replyMenuEventos(interaction);
    if (interaction.commandName === "sedes")     return replySedesAdmin(interaction);
    if (interaction.commandName === "lugares")   return replyLugaresAdmin(interaction);
    if (interaction.commandName === "config")    return replyConfig(interaction);
    if (interaction.commandName === "health")    return replyHealth(interaction);
    if (interaction.commandName === "forgetme")  return replyForgetMe(interaction);
    if (interaction.commandName === "ranking")   return replyRanking(interaction);
    if (interaction.commandName === "set")        return setMod.replySet(interaction);
    return;
  }

  // ----- Botones --------------------------------------------------------
  if (interaction.isButton()) {
    const id = interaction.customId;
    inc("button.use");

    if (id === "menu:asalto") return startWizard(interaction);
    if (id === "menu:rey") return rey.startWizard(interaction);
    if (id === "menu:battle") {
      return interaction.reply({ content: "⚔️ **Battle Royale** todavía no está implementado.", ephemeral: true });
    }

    if (id === "asalto:wizard:start") return wizardStart(interaction);
    if (id === "asalto:wizard:cancel") return wizardCancel(interaction);

    if (id.startsWith("asalto:pre:start:")) return preStart(interaction, id.split(":")[3]);
    if (id.startsWith("asalto:prep:start:")) return prepStart(interaction, id.split(":")[3]);
    if (id.startsWith("asalto:prep:cancel:")) return prepCancel(interaction, id.split(":")[3]);

    if (id.startsWith("asalto:ronda:gana:")) {
      const parts = id.split(":");
      return rondaGana(interaction, parts[3], parts.slice(4).join(":"));
    }
    if (id.startsWith("asalto:ronda:undo:")) return rondaUndo(interaction, id.split(":")[3]);
    if (id.startsWith("asalto:ronda:cancel:")) return rondaCancel(interaction, id.split(":")[3]);

    if (id.startsWith("asalto:res:next:")) return resNext(interaction, id.split(":")[3]);
    if (id.startsWith("asalto:res:tie:")) return resTie(interaction, id.split(":")[3]);
    if (id.startsWith("asalto:res:tiebreak:")) return resTiebreak(interaction, id.split(":")[3]);
    if (id.startsWith("asalto:res:end:")) return resEnd(interaction, id.split(":")[3]);

    if (id.startsWith("asalto:tb:gana:")) {
      const parts = id.split(":");
      return tbGana(interaction, parts[3], parts.slice(4).join(":"));
    }

    // ----- Rey del Crimen
    if (id === "rey:wizard:start")  return rey.wizardStart(interaction);
    if (id === "rey:wizard:cancel") return rey.wizardCancel(interaction);
    if (id.startsWith("rey:btn:iran:"))    return rey.btnIran(interaction, id.split(":")[3]);
    if (id.startsWith("rey:btn:noiran:"))  return rey.btnNoIran(interaction, id.split(":")[3]);
    if (id.startsWith("rey:btn:tepeada:")) return rey.btnTepeada(interaction, id.split(":")[3]);
    if (id.startsWith("rey:addleon:"))     return rey.btnAddLeon(interaction, id.split(":")[2]);
    if (id.startsWith("rey:delleon:"))     return rey.btnDelLeon(interaction, id.split(":")[2]);
    if (id.startsWith("rey:end:"))    return rey.endEvent(interaction, id.split(":")[2]);
    if (id.startsWith("rey:cancel:")) return rey.cancelEvent(interaction, id.split(":")[2]);

    // ----- Ranking
    if (id.startsWith("ranking:view:")) {
      return handleRankingViewButton(interaction, id.split(":")[2]);
    }

    // ----- /set
    if (id === "set:verify") return setMod.btnVerify(interaction);
    if (id.startsWith("set:approve:")) {
      return setMod.btnApprove(interaction, id.split(":")[2]);
    }
    if (id.startsWith("set:reject:")) {
      return setMod.btnReject(interaction, id.split(":")[2]);
    }
    if (id.startsWith("set:approve:")) return setMod.btnApprove(interaction, id.split(":")[2]);
    if (id.startsWith("set:reject:"))  return setMod.btnReject(interaction);

    if (id.startsWith("sedes:")) {
      const action = id.split(":")[1];
      if (action === "confirmDelete") return handleSedesConfirmDelete(interaction, id.split(":")[2]);
      return handleSedesButton(interaction, action);
    }

    if (id.startsWith("lugares:")) {
      const action = id.split(":")[1];
      if (action === "confirmDelete") return handleLugaresConfirmDelete(interaction, id.split(":")[2]);
      return handleLugaresButton(interaction, action);
    }
    return;
  }

  // ----- Selects --------------------------------------------------------
  if (interaction.isStringSelectMenu()) {
    const id = interaction.customId;
    if (id === "asalto:wizard:lugar") return wizardLugar(interaction);
    if (id === "asalto:wizard:def") return wizardDef(interaction);
    if (id === "asalto:wizard:atk") return wizardAtk(interaction);
    if (id.startsWith("sedes:select:")) {
      return handleSedesSelect(interaction, id.split(":")[2]);
    }
    if (id.startsWith("lugares:select:")) {
      return handleLugaresSelect(interaction, id.split(":")[2]);
    }
    if (id.startsWith("rey:apply:")) {
      // formato: rey:apply:<action>:<panelId>
      const parts = id.split(":");
      return rey.applySelection(interaction, parts[2], parts[3]);
    }
    if (id === "set:rango") return setMod.selectRango(interaction);
    if (id.startsWith("rey:delselect:")) {
      return rey.delLeonSelect(interaction, id.split(":")[2]);
    }
    return;
  }

  if (interaction.isUserSelectMenu()) {
    if (interaction.customId === "asalto:wizard:staff") return wizardStaff(interaction);
    if (interaction.customId === "rey:wizard:staff")    return rey.wizardStaff(interaction);
    if (interaction.customId.startsWith("rey:addselect:")) {
      return rey.addLeonSelect(interaction, interaction.customId.split(":")[2]);
    }
    return;
  }

  if (interaction.isRoleSelectMenu() || interaction.isChannelSelectMenu()) {
    if (interaction.customId.startsWith("config:")) return handleConfigSelect(interaction);
    return;
  }

  // ----- Modales --------------------------------------------------------
  if (interaction.isModalSubmit()) {
    const id = interaction.customId;
    if (id === "sedes:modal:create") return handleSedesModalCreate(interaction);
    if (id.startsWith("sedes:modal:edit:")) return handleSedesModalEdit(interaction, id.split(":")[3]);
    if (id === "lugares:modal:create") return handleLugaresModalCreate(interaction);
    if (id.startsWith("lugares:modal:edit:")) return handleLugaresModalEdit(interaction, id.split(":")[3]);
    if (id.startsWith("rey:modal:noiran:")) {
      // formato: rey:modal:noiran:<panelId>:<sedeIdx>
      const parts = id.split(":");
      return rey.modalNoIran(interaction, parts[3], parts[4]);
    }
    if (id === "set:modal:verify") return setMod.modalVerify(interaction);
    if (id.startsWith("set:modal:reject:")) {
      return setMod.modalReject(interaction, id.split(":")[3]);
    }
    return;
  }
}
