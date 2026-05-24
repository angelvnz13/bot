// Almacén en memoria + persistencia de los asaltos activos.

import { deleteAsaltoRow, persistAsalto } from "./db.js";
import { logger } from "./logger.js";

const asaltos = new Map();   // messageId -> state
const wizards = new Map();   // userId -> state (configuración previa al arranque)

function fireAndForget(promise, ctx) {
  promise.catch((err) =>
    logger.warn(ctx, { err: err?.message ?? String(err) }),
  );
}

export function setAsalto(messageId, state) {
  asaltos.set(messageId, state);
  fireAndForget(persistAsalto(state), "state.persistAsalto.failed");
}

export function getAsalto(messageId) {
  return asaltos.get(messageId);
}

export function touchAsalto(messageId) {
  const s = asaltos.get(messageId);
  if (s) fireAndForget(persistAsalto(s), "state.persistAsalto.failed");
}

export function deleteAsalto(messageId) {
  asaltos.delete(messageId);
  fireAndForget(deleteAsaltoRow(messageId), "state.deleteAsaltoRow.failed");
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

export function rehydrate(rows) {
  for (const r of rows) {
    asaltos.set(r.panelMessageId, r.state);
  }
}
