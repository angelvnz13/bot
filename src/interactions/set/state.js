// Estado temporal del flujo /set: guarda nombre+ICID hasta que se elige el rango.

const sessions = new Map(); // userId -> { nombre, icid, expiresAt }
const TTL_MS = 10 * 60 * 1000; // 10 minutos

export function setSession(userId, data) {
  sessions.set(String(userId), { ...data, expiresAt: Date.now() + TTL_MS });
}

export function getSession(userId) {
  const s = sessions.get(String(userId));
  if (!s) return null;
  if (s.expiresAt < Date.now()) {
    sessions.delete(String(userId));
    return null;
  }
  return s;
}

export function deleteSession(userId) {
  sessions.delete(String(userId));
}
