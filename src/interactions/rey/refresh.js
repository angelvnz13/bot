// Refresco del panel principal del Rey del Crimen.

import { logger } from "../../logger.js";
import { buildPanelEmbed } from "./embeds.js";
import { panelComponents } from "./components.js";

export async function refreshPanel(client, state) {
  try {
    const ch = await client.channels.fetch(state.privateChannelId);
    const msg = await ch.messages.fetch(state.panelMessageId);
    await msg.edit({
      embeds: [buildPanelEmbed(state)],
      components: panelComponents(state.panelMessageId),
    });
  } catch (e) {
    logger.warn("rey.refreshPanel.failed", { err: e.message });
  }
}
