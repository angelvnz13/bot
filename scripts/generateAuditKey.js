// Genera una clave AES-256 aleatoria en hex (64 caracteres). Pégala en .env como AUDIT_KEY.
import crypto from "node:crypto";
console.log(crypto.randomBytes(32).toString("hex"));
