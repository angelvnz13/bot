// Contadores e histogramas en memoria. Útil para /health y debugging.
// No es Prometheus; si lo necesitas, exporta estos números.

const counters = new Map();
const timings = new Map(); // name -> { count, totalMs, maxMs }

export function inc(name, by = 1) {
  counters.set(name, (counters.get(name) ?? 0) + by);
}

export function timed(name, ms) {
  const t = timings.get(name) ?? { count: 0, totalMs: 0, maxMs: 0 };
  t.count += 1;
  t.totalMs += ms;
  if (ms > t.maxMs) t.maxMs = ms;
  timings.set(name, t);
}

export function snapshot() {
  return {
    counters: Object.fromEntries(counters),
    timings: Object.fromEntries(
      [...timings.entries()].map(([k, v]) => [k, { ...v, avgMs: v.count ? v.totalMs / v.count : 0 }]),
    ),
    uptimeSec: Math.round(process.uptime()),
    rss: process.memoryUsage().rss,
    heapUsed: process.memoryUsage().heapUsed,
  };
}

// Helper para envolver una promesa y medirla.
export async function withTiming(name, fn) {
  const start = performance.now();
  try {
    return await fn();
  } finally {
    timed(name, performance.now() - start);
    inc(`${name}.calls`);
  }
}
