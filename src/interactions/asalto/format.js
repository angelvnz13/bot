// Helpers de formato para sedes y battle grounds.

import { decorate } from "../../emoji.js";

export function sedeStr(s) {
  if (!s) return "_pendiente_";
  return decorate(s.emoji, `**${s.name}**`);
}

export function bgStr(bg) {
  if (!bg) return "_pendiente_";
  const info = bg.info ? ` (${bg.info})` : "";
  return `**${bg.name}**${info}`;
}
