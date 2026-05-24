// Almacén en memoria + persistencia en SQLite de los asaltos activos.

import { deleteAsaltoRow, persistAsalto } from "./db.js";

const asaltos = new Map();   // messageId -> state
const wizards = new Map();   // userId -> state (configuración previa al arranque)

export function setAsalto(messageId, state) {
  asaltos.set(messageId, state);
  persistAsalto(state);
}

export function getAsalto(messageId) {
  return asaltos.get(messageId);
}

export function touchAsalto(messageId) {
  const s = asaltos.get(messageId);
  if (s) persistAsalto(s);
}

export function deleteAsalto(messageId) {
  asaltos.delete(messageId);
  deleteAsaltoRow(messageId);
}

export function setWizard(userId, state) {
  wizards.set(userId, state);
}

export function getWizard(userId) {
  return wizards.get(userId);
}

export function deleteWizard(userId) {
  wizards.delete(userId);
}

// Cargar asaltos persistidos al arrancar (se invoca desde index.js).
export function rehydrate(rows) {
  for (const r of rows) {
    asaltos.set(r.panelMessageId, r.state);
  }
}
