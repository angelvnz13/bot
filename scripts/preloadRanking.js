// Precarga de registros históricos en event_log para que aparezcan en /ranking.
//
// Uso: edita el array PRELOAD con los datos que quieras meter y ejecuta:
//   node scripts/preloadRanking.js
//
// Cada entrada inserta `count` filas con la fecha indicada para ese userId
// y eventType. Si la fecha es null, se usa Date.now().
//
// IMPORTANTE: este script SOLO añade registros, no borra los existentes.
// Si lo ejecutas dos veces, los conteos se duplican. Para empezar limpio:
//   node -e "import('./src/db.js').then(m=>m.default.prepare('DELETE FROM event_log').run())"

import db from "../src/db.js";

// Edita el guildId al de tu servidor.
const GUILD_ID = "1503585441658441849";

// Pega aquí los datos. Formato:
//   { userId: "<discord-user-id>", count: <número>, eventType: "asalto"|"rey"|"battle", date: "YYYY-MM-DD" }
const PRELOAD = [
  // ===== Ejemplos basados en los registros que enviaste =====
  // Reemplaza los IDs por los reales de cada usuario.
  // Si no sabes los IDs, mira un mensaje de la persona en Discord, click derecho
  // -> "Copiar ID" (necesitas Modo Desarrollador activado).

  // Alice (Lid) — 8 asaltos del 22-25/05
  // { userId: "ALICE_DISCORD_ID", count: 8, eventType: "asalto", date: "2026-05-23" },

  // Ramon (Sub)
  // { userId: "RAMON_DISCORD_ID", count: 6, eventType: "asalto", date: "2026-05-25" },

  // Alfredo
  // { userId: "ALFREDO_DISCORD_ID", count: 4, eventType: "asalto", date: "2026-05-25" },

  // ... añade el resto
];

function dateToMs(dateStr) {
  if (!dateStr) return Date.now();
  // YYYY-MM-DD a medio día UTC para evitar líos de zona horaria.
  return Date.parse(`${dateStr}T12:00:00Z`);
}

const stmt = db.prepare(
  "INSERT INTO event_log(guild_id, user_id, event_type, created_at) VALUES (?, ?, ?, ?)",
);

const tx = db.transaction((entries) => {
  let total = 0;
  for (const e of entries) {
    const t = dateToMs(e.date);
    for (let i = 0; i < (e.count ?? 1); i++) {
      stmt.run(GUILD_ID, String(e.userId), String(e.eventType ?? "asalto"), t + i);
      total += 1;
    }
  }
  return total;
});

if (!PRELOAD.length) {
  console.log("⚠️  PRELOAD está vacío. Edita scripts/preloadRanking.js y añade entradas.");
  process.exit(0);
}

const inserted = tx(PRELOAD);
console.log(`✅ ${inserted} registros añadidos al event_log.`);

const summary = db.prepare(`
  SELECT user_id, event_type, COUNT(*) AS n
  FROM event_log
  WHERE guild_id = ?
  GROUP BY user_id, event_type
  ORDER BY n DESC, user_id
`).all(GUILD_ID);

console.log("\nResumen por usuario:");
for (const r of summary) {
  console.log(`  ${r.user_id}: ${r.event_type} = ${r.n}`);
}
