// Utilidades para manejar emojis (unicode o custom de Discord) en componentes.

const CUSTOM_RE = /^<(a)?:(\w+):(\d+)>$/;

// Discord solo acepta como `emoji` de opción/botón:
// - Custom de Discord (tienen id)
// - Caracteres Unicode con la propiedad Extended_Pictographic
//   (más combinadores ZWJ, variation selectors, banderas regionales, dígitos enclosing keycap)
// Otros símbolos (♛, ★, ☆, ✦, etc.) parecen emojis pero NO lo son y producen
// "COMPONENT_INVALID_EMOJI". Esta regex evita mandárselos a Discord.
const VALID_UNICODE_EMOJI_RE =
  /^(?:\p{Extended_Pictographic}|[\u200D\uFE0F\u20E3#*0-9]|[\u{1F1E6}-\u{1F1FF}])+$/u;

/**
 * Convierte el string del campo `emoji` a la forma que esperan
 * SelectOption.emoji / ButtonBuilder.setEmoji:
 * - Unicode válido → string del emoji
 * - Custom de Discord (<:nombre:id> o <a:nombre:id>) → { id, name, animated }
 * - Vacío o no válido → null
 */
export function parseEmoji(value) {
  if (!value) return null;
  const v = String(value).trim();
  if (!v) return null;
  const m = v.match(CUSTOM_RE);
  if (m) return { animated: m[1] === "a", name: m[2], id: m[3] };
  return VALID_UNICODE_EMOJI_RE.test(v) ? v : null;
}

/** Forma "emoji + texto" para títulos/descripciones (no se valida porque Markdown sí lo renderiza). */
export function decorate(value, name) {
  const e = String(value || "").trim();
  return e ? `${e} ${name}` : name;
}
