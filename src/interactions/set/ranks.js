// Configuración de los 5 rangos: rol de Discord + prefijo del nick.

export const RANKS = [
  { key: "aux",     label: "Auxiliar", emoji: "🛠️", roleId: "1507169423386214561", prefix: "Aux.ENT" },
  { key: "lid",     label: "Lid",      emoji: "👑", roleId: "1504318468185526343", prefix: "Lid.ENT" },
  { key: "sub",     label: "Sub",      emoji: "⭐", roleId: "1507777579405410425", prefix: "Sub.ENT" },
  { key: "miembro", label: "Miembro",  emoji: "🦁", roleId: "1504315840252739634", prefix: "ENT" },
  { key: "tester",  label: "Tester",   emoji: "🧪", roleId: "1504661090896842793", prefix: "ENT-T" },
];

export const RANK_BY_KEY = Object.fromEntries(RANKS.map((r) => [r.key, r]));
export const ALL_RANK_ROLE_IDS = RANKS.map((r) => r.roleId);

export function buildNickname({ prefix, nombre, icid }) {
  // Discord limita el nick a 32 chars; truncamos si es necesario.
  const full = `${prefix} |🎆${nombre} | ${icid}`;
  return full.slice(0, 32);
}
