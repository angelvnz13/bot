// Reglas de validación y sanitización de nombres, coordenadas y emojis.

const NAME_RE = /^[\p{L}\p{N} .,'_♛()-]+$/u;
const COORDS_RE = /^-?\d+(\.\d+)?(\s*,\s*-?\d+(\.\d+)?){0,3}$/;

export function sanitizeName(name) {
  const n = String(name ?? "").trim().slice(0, 50);
  if (!n) throw new Error("El nombre no puede estar vacío.");
  if (!NAME_RE.test(n)) throw new Error("El nombre contiene caracteres no permitidos.");
  return n;
}

export function sanitizeCoords(coords) {
  const c = String(coords ?? "").trim().slice(0, 100);
  if (!c) return "";
  if (!COORDS_RE.test(c)) throw new Error("Las coordenadas deben tener formato `x,y[,z[,r]]` con números.");
  return c;
}

export function sanitizeEmoji(emoji) {
  return String(emoji ?? "").replace(/\s+/g, "").slice(0, 10);
}
