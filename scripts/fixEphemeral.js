// Reemplaza `ephemeral: true` por `flags: 64` (MessageFlags.Ephemeral) en todo
// src/. Es el reemplazo recomendado en discord.js v14.16+.

import fs from "node:fs";
import path from "node:path";

function walk(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir)) {
    const full = path.join(dir, e);
    const st = fs.statSync(full);
    if (st.isDirectory() && e !== "node_modules" && !e.startsWith(".")) {
      out.push(...walk(full));
    } else if (full.endsWith(".js")) {
      out.push(full);
    }
  }
  return out;
}

let totalFiles = 0;
let totalReplacements = 0;

for (const file of walk("src")) {
  const before = fs.readFileSync(file, "utf8");
  const after = before.replace(/ephemeral:\s*true/g, "flags: 64");
  if (after !== before) {
    fs.writeFileSync(file, after);
    const count = (before.match(/ephemeral:\s*true/g) || []).length;
    totalFiles += 1;
    totalReplacements += count;
    console.log(`  ${file}: ${count}`);
  }
}

console.log(`\n✅ ${totalReplacements} reemplazos en ${totalFiles} archivos.`);
