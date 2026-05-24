import { test, describe } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";

// Configuramos AUDIT_KEY antes de importar
process.env.AUDIT_KEY = crypto.randomBytes(32).toString("hex");

const { audit, decryptLines, forgetUserFromAudit } = await import("../src/audit.js");
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AUDIT_PATH = path.resolve(__dirname, "..", "audit.log");

describe("audit log cifrado", () => {
  test("escribe y descifra correctamente", async () => {
    fs.writeFileSync(AUDIT_PATH, ""); // limpio
    audit("test.event", { userId: "12345", value: 42 });
    await new Promise((r) => setTimeout(r, 50)); // esperar fs.appendFile

    const data = fs.readFileSync(AUDIT_PATH);
    const lines = decryptLines(data);
    assert.ok(lines.some((l) => l.includes('"userId":"12345"') && l.includes('"action":"test.event"')));
  });

  test("forgetUserFromAudit elimina entradas", async () => {
    fs.writeFileSync(AUDIT_PATH, "");
    audit("test.event", { userId: "u1" });
    audit("test.event", { userId: "u2" });
    await new Promise((r) => setTimeout(r, 50));

    const result = forgetUserFromAudit("u1");
    assert.ok(result.removed >= 1);

    const remaining = decryptLines(fs.readFileSync(AUDIT_PATH));
    assert.ok(!remaining.some((l) => l.includes('"userId":"u1"')));
    assert.ok(remaining.some((l) => l.includes('"userId":"u2"')));
  });
});
