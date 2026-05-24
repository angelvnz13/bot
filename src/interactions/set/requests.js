// Persistencia ligera de solicitudes pendientes de aprobación.
// Clave = messageId de la solicitud publicada en el canal de revisión.

const requests = new Map(); // messageId -> { userId, rankKey, nombre, icid, createdAt, status }

export function createRequest({ userId, rankKey, nombre, icid }) {
  return { userId, rankKey, nombre, icid, createdAt: Date.now(), status: "pending" };
}

export function saveRequest(messageId, req) {
  requests.set(String(messageId), req);
}

export function getRequest(messageId) {
  return requests.get(String(messageId));
}

export function deleteRequest(messageId) {
  requests.delete(String(messageId));
}

// Limpieza automática cada 30 min: elimina solicitudes resueltas con más de 1h.
setInterval(() => {
  const now = Date.now();
  for (const [id, r] of requests) {
    if (r.status !== "pending" && now - r.createdAt > 60 * 60 * 1000) {
      requests.delete(id);
    }
  }
}, 30 * 60 * 1000).unref();
