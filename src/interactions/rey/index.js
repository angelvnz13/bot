// API pública del módulo Rey del Crimen.

export {
  startWizard,
  wizardStaff,
  wizardCancel,
  wizardStart,
} from "./wizard.js";

export {
  btnIran,
  btnNoIran,
  btnTepeada,
  applySelection,
  modalNoIran,
} from "./decisions.js";

export {
  btnAddLeon,
  addLeonSelect,
  btnDelLeon,
  delLeonSelect,
} from "./leones.js";

export { endEvent, cancelEvent } from "./closing.js";
