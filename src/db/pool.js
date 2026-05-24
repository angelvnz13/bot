// Pool de conexiones a Postgres (Supabase u otro proveedor).
//
// Variables esperadas:
//   DATABASE_URL   conn string (recomendado: el "Session" pooler de Supabase)
//
// El esquema se crea/migra al arrancar.

import pg from "pg";

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;

// El pool se crea de forma perezosa: si el módulo se importa solo para usar
// otras utilidades (p. ej. tests de lógica que no tocan DB), no obligamos a
// tener DATABASE_URL definida. Solo falla cuando alguien intenta consultar.
let _pool = null;

function getPool() {
  if (_pool) return _pool;
  if (!connectionString) {
    throw new Error("DATABASE_URL no definida");
  }
  // Forzamos rejectUnauthorized:false para aceptar el certificado intermedio
  // que Supabase usa en su pooler. Le pasamos el ssl como objeto al Pool y
  // limpiamos `sslmode` del connection string para que pg no intente validar
  // el cert con verify-full por su cuenta.
  const cleaned = connectionString.replace(/[?&]sslmode=[^&]+/g, (m) =>
    m.startsWith("?") ? "?" : "",
  );
  _pool = new Pool({
    connectionString: cleaned.endsWith("?") ? cleaned.slice(0, -1) : cleaned,
    ssl: { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 30_000,
  });
  return _pool;
}

export const pool = new Proxy({}, {
  get(_t, prop) {
    const p = getPool();
    const v = p[prop];
    return typeof v === "function" ? v.bind(p) : v;
  },
});

export async function query(text, params) {
  return getPool().query(text, params);
}

// --- Esquema (idempotente) ----------------------------------------------
const SCHEMA = `
CREATE TABLE IF NOT EXISTS sedes (
  id     SERIAL PRIMARY KEY,
  name   TEXT UNIQUE NOT NULL,
  coords TEXT NOT NULL DEFAULT '',
  emoji  TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS sedes_eliminadas (
  name        TEXT PRIMARY KEY,
  deleted_at  BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS battle_grounds (
  id         SERIAL PRIMARY KEY,
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
  updated_at         BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS event_log (
  id          SERIAL PRIMARY KEY,
  guild_id    TEXT NOT NULL,
  user_id     TEXT NOT NULL,
  event_type  TEXT NOT NULL,
  created_at  BIGINT NOT NULL
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

CREATE TABLE IF NOT EXISTS guild_config (
  guild_id        TEXT PRIMARY KEY,
  admin_role_id   TEXT,
  category_id     TEXT,
  log_channel_id  TEXT,
  updated_at      BIGINT NOT NULL
);
`;

let initialized = false;
export async function initSchema() {
  if (initialized) return;
  await getPool().query(SCHEMA);
  initialized = true;
}
