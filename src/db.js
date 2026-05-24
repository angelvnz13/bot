// Fachada del módulo de base de datos. Re-exporta la API pública por dominio.

export { pool, query, initSchema } from "./db/pool.js";

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
} from "./db/eventLogRepo.js";

export {
  registerRankingPanel,
  setRankingPanelView,
  getRankingPanel,
  unregisterRankingPanel,
  listRankingPanels,
} from "./db/rankingPanelsRepo.js";

export {
  getGuildConfigRow,
  upsertGuildConfig,
} from "./db/guildConfigRepo.js";
