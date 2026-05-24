// EventBus interno del proceso. Permite que módulos se notifiquen
// sin acoplarse mutuamente (p.ej. db -> ranking sin que db importe ranking).

import { EventEmitter } from "node:events";

export const events = new EventEmitter();
events.setMaxListeners(50);
