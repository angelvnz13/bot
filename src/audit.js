// Audit log cifrado en disco con AES-256-GCM.
// La clave proviene de AUDIT_KEY (hex de 64 caracteres = 32 bytes).
// Si no está definida, registra en claro y avisa.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";

import { logger } from "./logger.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AUDIT_PATH = process.env.AUDIT_PATH
  ? path.resolve(process.env.AUDIT_PATH)
  : path.resolve(__dirname, "..", "audit.log");

// Asegura que el directorio existe (útil cuando AUDIT_PATH apunta a un volumen)
try {
  fs.mkdirSync(path.dirname(AUDIT_PATH), { recursive: true });
} catch {}

function getKey() {
  const hex = process.env.AUDIT_KEY;
  if (!hex) return null;
  if (!/^[0-9a-fA-F]{64}$/.test(hex)) {
    logger.warn("audit.key.invalid", { reason: "AUDIT_KEY debe ser hex de 64 caracteres" });
    return null;
  }
  return Buffer.from(hex, "hex");
}

const KEY = getKey();
if (!KEY) {
  logger.warn("audit.key.missing", { msg: "Audit log se escribirá sin cifrar. Genera AUDIT_KEY (32 bytes hex)." });
}

function encryptLine(plain) {
  if (!KEY) return Buffer.from(`PLAIN ${plain}`);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", KEY, iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  // formato: iv(12) | tag(16) | ciphertext, todo en base64 + newline
  return Buffer.concat([iv, tag, enc]).toString("base64");
}

export function audit(action, details = {}) {
  try {
    const record = JSON.stringify({
      t: new Date().toISOString(),
      action,
      ...details,
    });
    const out = encryptLine(record);
    fs.appendFile(AUDIT_PATH, out + "\n", (err) => {
      if (err) logger.error("audit.write.failed", { err: err.message });
    });
  } catch (e) {
    logger.error("audit.exception", { err: e.message });
  }
}

// Util para descifrar offline (no expuesto al bot).
export function decryptLines(buffer) {
  if (!KEY) throw new Error("AUDIT_KEY no definida");
  const lines = buffer.toString("utf8").split("\n").filter(Boolean);
  return lines.map((line) => {
    if (line.startsWith("PLAIN ")) return line.slice(6);
    const all = Buffer.from(line, "base64");
    const iv = all.subarray(0, 12);
    const tag = all.subarray(12, 28);
    const enc = all.subarray(28);
    const decipher = crypto.createDecipheriv("aes-256-gcm", KEY, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf8");
  });
}

// Para /forgetme: reescribe el audit eliminando registros de un userId.
// No descifra si no hay clave (no podemos saber qué borrar) salvo entradas PLAIN.
export function forgetUserFromAudit(userId) {
  if (!fs.existsSync(AUDIT_PATH)) return { removed: 0, skipped: 0 };
  const data = fs.readFileSync(AUDIT_PATH);
  const lines = data.toString("utf8").split("\n").filter(Boolean);
  let removed = 0;
  let skipped = 0;

  const kept = [];
  for (const line of lines) {
    let plain;
    try {
      if (line.startsWith("PLAIN ")) {
        plain = line.slice(6);
      } else if (KEY) {
        const all = Buffer.from(line, "base64");
        const iv = all.subarray(0, 12);
        const tag = all.subarray(12, 28);
        const enc = all.subarray(28);
        const dec = crypto.createDecipheriv("aes-256-gcm", KEY, iv);
        dec.setAuthTag(tag);
        plain = Buffer.concat([dec.update(enc), dec.final()]).toString("utf8");
      } else {
        kept.push(line); // no podemos leerla
        skipped += 1;
        continue;
      }
    } catch {
      kept.push(line);
      skipped += 1;
      continue;
    }

    if (plain.includes(`"userId":"${userId}"`)) {
      removed += 1;
      continue;
    }
    kept.push(line);
  }

  fs.writeFileSync(AUDIT_PATH, kept.join("\n") + (kept.length ? "\n" : ""));
  return { removed, skipped };
}
