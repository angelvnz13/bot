// Token bucket por clave (userId, guildId, etc.) en memoria.

const buckets = new Map();

export function checkRate(key, { capacity = 5, refillPerSec = 1 } = {}) {
  const now = Date.now();
  const b = buckets.get(key) ?? { tokens: capacity, last: now };
  const elapsedSec = (now - b.last) / 1000;
  b.tokens = Math.min(capacity, b.tokens + elapsedSec * refillPerSec);
  b.last = now;

  if (b.tokens < 1) {
    buckets.set(key, b);
    const waitSec = (1 - b.tokens) / refillPerSec;
    return { ok: false, retryAfterSec: Math.ceil(waitSec) };
  }
  b.tokens -= 1;
  buckets.set(key, b);
  return { ok: true };
}

// Limpieza periódica para no crecer sin límite (cada 10 min).
setInterval(() => {
  const now = Date.now();
  for (const [k, b] of buckets) {
    if (now - b.last > 30 * 60 * 1000) buckets.delete(k);
  }
}, 10 * 60 * 1000).unref();
