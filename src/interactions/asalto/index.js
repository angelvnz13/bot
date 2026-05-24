// API pública del módulo asalto. Re-exporta funciones y helpers
// agrupados por responsabilidad.

export {
  newAsaltoState,
  bandosParaRonda,
  marcadorStr,
  hayEmpateFinal,
  staffMentions,
} from "./state.js";

export {
  buildSetupEmbed,
  buildPreInicioEmbed,
  buildAvisoEmbed,
  buildAviso3MinEmbed,
  buildRondaInicioEmbed,
  buildRondaCopyText,
  buildRondaFinEmbed,
  buildEmpateEmbed,
  buildFinalEmbed,
  buildCanceladoEmbed,
  buildResumenEmbed,
} from "./embeds.js";

export {
  rowLugarSelect,
  rowSedeDef,
  rowSedeAtk,
  rowStaff,
  rowIniciar,
  rowPreInicio,
  rowPreparacion,
  rowRonda,
  rowResultadoRonda,
  rowDesempate,
} from "./components.js";

export {
  startWizard,
  wizardLugar,
  wizardDef,
  wizardAtk,
  wizardStaff,
  wizardCancel,
  wizardStart,
} from "./wizard.js";

export { cerrarAsalto } from "./closing.js";
