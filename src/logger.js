// Logger estructurado mínimo (JSON-line) sin dependencias.
// Para enviar a un servicio externo (Sentry, Loki, etc.), envuelve estos métodos.

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };
const LEVEL = (process.env.LOG_LEVEL || "info").toLowerCase();
const THRESHOLD = LEVELS[LEVEL] ?? LEVELS.info;

function emit(level, msg, extra = {}) {
  if (LEVELS[level] < THRESHOLD) return;
  const line = JSON.stringify({
    t: new Date().toISOString(),
    level,
    msg,
    ...extra,
  });
  if (level === "error" || level === "warn") console.error(line);
  else console.log(line);
}

export const logger = {
  debug: (msg, extra) => emit("debug", msg, extra),
  info:  (msg, extra) => emit("info", msg, extra),
  warn:  (msg, extra) => emit("warn", msg, extra),
  error: (msg, extra) => emit("error", msg, extra),
};
