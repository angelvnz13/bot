// Validación de inputs del flujo /set.

const NAME_RE = /^[\p{L}\p{N} .,'_♛()-]+$/u;
const ICID_RE = /^[A-Za-z0-9]{1,15}$/;

export function sanitizeNombre(value) {
  const v = String(value ?? "").trim().slice(0, 24);
  if (!v) throw new Error("El nombre no puede estar vacío.");
  if (!NAME_RE.test(v)) throw new Error("El nombre contiene caracteres no permitidos.");
  return v;
}

export function sanitizeIcid(value) {
  const v = String(value ?? "").trim();
  if (!v) throw new Error("El ICID no puede estar vacío.");
  if (!ICID_RE.test(v)) throw new Error("El ICID solo puede contener letras y números (máx. 15).");
  return v;
}
