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

import { logger } from "./logger.js";
import { audit } from "./audit.js";
import { loadActiveAsaltos } from "./db.js";
import { rehydrate } from "./state.js";
import { inc } from "./metrics.js";

const TOKEN = process.env.DISCORD_TOKEN;
if (!TOKEN) {
  logger.error("startup.no_token");
  process.exit(1);
}

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

client.once("ready", async () => {
  logger.info("ready", { user: client.user.tag, id: client.user.id });
  audit("bot.startup", { tag: client.user.tag });

  // Auto-seed: si la DB está vacía (instalación nueva), pobla sedes y lugares.
  try {
    seedDefaultsIfEmpty();
  } catch (e) {
    logger.error("seed.failed", { err: e.message });
  }

  attachRankingClient(client);

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
});

client.on("interactionCreate", (interaction) => {
  inc("interaction.received");
  handleInteraction(interaction).catch((err) => {
    logger.error("interaction.unhandled", { err: err?.message, stack: err?.stack });
  });
});

client.on("messageCreate", async (msg) => {
  if (msg.author.bot || !msg.guild) return;
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
  logger.info("shutdown.start", { signal });
  audit("bot.shutdown", { signal });
  try {
    await client.destroy();
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
