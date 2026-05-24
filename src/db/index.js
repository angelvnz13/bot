// Conexión y esquema de la base de datos.
// Cada dominio vive en su propio módulo (sedesRepo, battleGroundsRepo, etc.)
// y se importa desde aquí.

import Database from "better-sqlite3";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.resolve(__dirname, "..", "..", "data.db");

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");
db.pragma("synchronous = NORMAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS sedes (
    id     INTEGER PRIMARY KEY AUTOINCREMENT,
    name   TEXT UNIQUE NOT NULL,
    coords TEXT NOT NULL DEFAULT '',
    emoji  TEXT NOT NULL DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS sedes_eliminadas (
    name        TEXT PRIMARY KEY,
    deleted_at  INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS battle_grounds (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT UNIQUE NOT NULL,
    coords_def TEXT NOT NULL,
    coords_atk TEXT NOT NULL,
    info       TEXT NOT NULL DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS asaltos_activos (
    panel_message_id   TEXT PRIMARY KEY,
    guild_id           TEXT NOT NULL,
    private_channel_id TEXT,
    state_json         TEXT NOT NULL,
    updated_at         INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS event_log (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id    TEXT NOT NULL,
    user_id     TEXT NOT NULL,
    event_type  TEXT NOT NULL,
    created_at  INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS event_log_guild_user_idx
    ON event_log(guild_id, user_id);
  CREATE INDEX IF NOT EXISTS event_log_guild_type_idx
    ON event_log(guild_id, event_type);
  CREATE INDEX IF NOT EXISTS event_log_guild_created_idx
    ON event_log(guild_id, created_at);

  CREATE TABLE IF NOT EXISTS ranking_panels (
    channel_id TEXT NOT NULL,
    message_id TEXT NOT NULL,
    guild_id   TEXT NOT NULL,
    view       TEXT NOT NULL DEFAULT 'total',
    PRIMARY KEY (channel_id, message_id)
  );
  CREATE INDEX IF NOT EXISTS ranking_panels_guild_idx
    ON ranking_panels(guild_id);
`);

// --- Migraciones idempotentes -------------------------------------------
function ensureColumn(table, column, ddl) {
  try {
    const cols = db.prepare(`PRAGMA table_info(${table})`).all();
    if (!cols.some((c) => c.name === column)) {
      db.exec(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
    }
  } catch {}
}

ensureColumn("ranking_panels", "view", "view TEXT NOT NULL DEFAULT 'total'");
ensureColumn("sedes", "emoji", "emoji TEXT NOT NULL DEFAULT ''");

export default db;
