import "dotenv/config";
import {
  Client,
  GatewayIntentBits,
  Partials,
  REST,
  Routes,
  SlashCommandBuilder,
} from "discord.js";

import { handleInteraction } from "./interactions/router.js";
import { sendMenuEventos } from "./interactions/menu.js";
import { sendSedesAdmin } from "./interactions/sedesAdmin.js";
import { attachRankingClient } from "./interactions/ranking.js";
import { seedDefaultsIfEmpty } from "./seedDefaults.js";
import { discoverRankingPanels } from "./restoreRanking.js";
import { restoreEventsFromChannel } from "./restoreEvents.js";

import { logger } from "./logger.js";
import { audit } from "./audit.js";
import { loadActiveAsaltos } from "./db.js";
import { rehydrate } from "./state.js";
import { inc } from "./metrics.js";
import { ASALTO_CATEGORY_ID, ASALTO_LOG_CHANNEL } from "./config.js";
import { setGuildConfig } from "./guildConfig.js";

const TOKEN = process.env.DISCORD_TOKEN;
if (!TOKEN) {
  logger.error("startup.no_token");
  process.exit(1);
}

// Guard de listo: evita procesar interacciones antes de que el bot termine
// la inicialización (seed, rehydrate, sync de comandos).
let ready = false;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel],
});

const commands = [
  new SlashCommandBuilder().setName("evento").setDescription("Abrir el menú de eventos").toJSON(),
  new SlashCommandBuilder().setName("sedes").setDescription("Gestionar sedes (admin)").toJSON(),
  new SlashCommandBuilder().setName("lugares").setDescription("Gestionar lugares de enfrentamiento (admin)").toJSON(),
  new SlashCommandBuilder().setName("config").setDescription("Configurar el bot en este servidor (admin)").toJSON(),
  new SlashCommandBuilder().setName("health").setDescription("Estado y métricas del bot (admin)").toJSON(),
  new SlashCommandBuilder().setName("forgetme").setDescription("Eliminar tus datos personales del bot (RGPD)").toJSON(),
  new SlashCommandBuilder().setName("ranking").setDescription("Top de organizadores de eventos en este servidor").toJSON(),
  new SlashCommandBuilder().setName("set").setDescription("Verificarse y obtener tu rango").toJSON(),
];

// discord.js v15 renombró "ready" → "clientReady". Usamos ambos para compat.
const READY_EVENT = client.once ? "ready" : "clientReady";
client.once(READY_EVENT, async () => {
  logger.info("ready", { user: client.user.tag, id: client.user.id });
  audit("bot.startup", { tag: client.user.tag });

  // Auto-seed: si la DB está vacía (instalación nueva), pobla sedes y lugares.
  try {
    seedDefaultsIfEmpty();
  } catch (e) {
    logger.error("seed.failed", { err: e.message });
  }

  attachRankingClient(client);

  // Auto-configurar guild con los IDs hardcodeados (sobrevive a reinicios)
  try {
    for (const [, guild] of client.guilds.cache) {
      setGuildConfig(guild.id, {
        categoryId: ASALTO_CATEGORY_ID,
        logChannelId: ASALTO_LOG_CHANNEL,
      });
    }
  } catch (e) {
    logger.warn("guildConfig.autoSet.failed", { err: e.message });
  }

  // Auto-descubrir paneles de ranking existentes en los canales
  try {
    await discoverRankingPanels(client);
  } catch (e) {
    logger.warn("ranking.discovery.failed", { err: e.message });
  }

  // Reconstruir event_log desde el canal de registro (sobrevive reinicios)
  try {
    await restoreEventsFromChannel(client);
  } catch (e) {
    logger.warn("restoreEvents.failed", { err: e.message });
  }

  // Rehidratar asaltos activos persistidos
  try {
    const rows = loadActiveAsaltos();
    rehydrate(rows);
    logger.info("rehydrate", { count: rows.length });
  } catch (e) {
    logger.error("rehydrate.failed", { err: e.message });
  }

  // Sincronizar slash commands
  try {
    const rest = new REST({ version: "10" }).setToken(TOKEN);
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
    logger.info("commands.synced", { count: commands.length });
  } catch (e) {
    logger.error("commands.sync.failed", { err: e.message });
  }

  // Marcar listo DESPUÉS de toda la inicialización.
  ready = true;
  logger.info("ready.complete");
});

client.on("interactionCreate", (interaction) => {
  inc("interaction.received");

  // Si el bot se está apagando o aún no terminó de iniciar, rechaza silenciosamente.
  if (!ready) {
    if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
      interaction
        .reply({ content: "⏳ El bot se está reiniciando. Espera unos segundos e intenta de nuevo.", flags: 64 })
        .catch(() => {});
    }
    return;
  }

  handleInteraction(interaction).catch((err) => {
    logger.error("interaction.unhandled", { err: err?.message, stack: err?.stack });
  });
});

client.on("messageCreate", async (msg) => {
  if (!ready || msg.author.bot || !msg.guild) return;
  if (msg.content === "!evento") {
    await sendMenuEventos(msg.channel).catch((e) => logger.warn("prefix.evento.failed", { err: e.message }));
  } else if (msg.content === "!sedes") {
    await sendSedesAdmin(msg.channel).catch((e) => logger.warn("prefix.sedes.failed", { err: e.message }));
  }
});

client.on("shardError", (err) => logger.error("shard.error", { err: err.message }));
client.on("error", (err) => logger.error("client.error", { err: err.message }));
client.on("warn", (msg) => logger.warn("client.warn", { msg }));

// Errores globales
process.on("unhandledRejection", (reason) => {
  logger.error("unhandledRejection", { reason: String(reason?.stack || reason) });
});
process.on("uncaughtException", (err) => {
  logger.error("uncaughtException", { err: err.message, stack: err.stack });
});

// Graceful shutdown
let shuttingDown = false;
async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  ready = false; // Rechaza nuevas interacciones inmediatamente
  logger.info("shutdown.start", { signal });
  audit("bot.shutdown", { signal });
  try {
    await client.destroy();
  } catch (e) {
    logger.error("shutdown.destroy.error", { err: e.message });
  } finally {
    setTimeout(() => process.exit(0), 500).unref();
  }
}
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

client.login(TOKEN).catch((err) => {
  logger.error("login.failed", { err: err.message });
  process.exit(1);
});
