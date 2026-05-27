// Fachada del módulo de base de datos.
// Re-exporta la API pública agrupada por dominio. Si necesitas tocar la
// implementación, edita los módulos en src/db/.

export { default } from "./db/index.js";

export {
  listSedes,
  getSede,
  createSede,
  updateSede,
  deleteSede,
  countSedes,
  replaceAllSedes,
  listTombstones,
  clearTombstone,
} from "./db/sedesRepo.js";

export {
  listBattleGrounds,
  getBattleGround,
  createBattleGround,
  updateBattleGround,
  deleteBattleGround,
  replaceAllBattleGrounds,
} from "./db/battleGroundsRepo.js";

export {
  persistAsalto,
  loadActiveAsaltos,
  deleteAsaltoRow,
} from "./db/asaltosRepo.js";

export {
  logEvent,
  getRanking,
  getRankingSince,
  totalEventsForGuild,
  deleteEventsForUser,
  deleteEventsForUserAt,
} from "./db/eventLogRepo.js";

export {
  registerRankingPanel,
  setRankingPanelView,
  getRankingPanel,
  unregisterRankingPanel,
  listRankingPanels,
} from "./db/rankingPanelsRepo.js";

export {
  createSetRequest,
  attachRequestMessage,
  getSetRequestByMessage,
  setRequestStatus,
  deleteSetRequestsByUser,
} from "./db/setRequestsRepo.js";
