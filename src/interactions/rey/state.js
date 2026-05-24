// Estado del Rey del Crimen + helpers de reparto.

import crypto from "node:crypto";

export const reyes = new Map();        // panelMessageId -> state
export const reyWizards = new Map();   // userId -> wizardState

export const STATUS_PENDING  = "pending";
export const STATUS_IRAN     = "iran";
export const STATUS_NO_IRAN  = "no_iran";
export const STATUS_TEPEADA  = "tepeada";

export function statusEmoji(status) {
  switch (status) {
    case STATUS_IRAN:    return "✅";
    case STATUS_NO_IRAN: return "🚫";
    case STATUS_TEPEADA: return "💢";
    default:             return "⏳";
  }
}

export function statusLabel(status) {
  switch (status) {
    case STATUS_IRAN:    return "Irán";
    case STATUS_NO_IRAN: return "No iran";
    case STATUS_TEPEADA: return "Tepeada";
    default:             return "Pendiente";
  }
}

export function newWizard(userId) {
  return { ownerId: userId, staffIds: [] };
}

export function newReyState({ ownerId, guildId, leones }) {
  return {
    ownerId,
    guildId,
    privateChannelId: null,
    panelMessageId: null,
    closed: false, // marca cuando ya se cerró (evita doble cierre)
    leones, // [{ userId, sedes: [{ sede, status, razon }] }]
  };
}

export function shuffle(arr) {
  // Fisher-Yates con crypto.randomInt para evitar sesgo de Math.random()
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function repartirSedes(sedes, leones) {
  const sedesShuf  = shuffle(sedes);
  const leonesShuf = shuffle(leones);
  const out = leonesShuf.map((id) => ({ userId: id, sedes: [] }));
  for (let i = 0; i < sedesShuf.length; i++) {
    out[i % out.length].sedes.push({
      sede: sedesShuf[i],
      status: STATUS_PENDING,
      razon: null,
    });
  }
  return out;
}

export function findLeon(state, userId) {
  const idx = state.leones.findIndex((l) => l.userId === userId);
  if (idx === -1) return null;
  return { idx, leon: state.leones[idx] };
}

export function buildResumenLinea(state) {
  let iran = 0, noIran = 0, tepeada = 0, pendiente = 0;
  for (const l of state.leones) {
    for (const s of l.sedes) {
      if (s.status === STATUS_IRAN) iran += 1;
      else if (s.status === STATUS_NO_IRAN) noIran += 1;
      else if (s.status === STATUS_TEPEADA) tepeada += 1;
      else pendiente += 1;
    }
  }
  return `✅ Irán: **${iran}**  •  🚫 No iran: **${noIran}**  •  💢 Tepeada: **${tepeada}**  •  ⏳ Pendientes: **${pendiente}**`;
}
