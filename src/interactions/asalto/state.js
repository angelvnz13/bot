// Estado del asalto: factory, helpers de bandos, marcador y staff.

export function newAsaltoState(userId) {
  return {
    ownerId: userId,
    battleground: null,         // { id, name, coords_def, coords_atk, info }
    sedeDef: null,
    sedeAtk: null,
    staffIds: [],
    score: {},                  // { [sedeName]: number }
    history: [],                // [{ ronda, ganador, atk, dfn }]
    currentRound: 0,
    cancelled: false,
    closed: false,              // marca cuando ya se cerró (evita doble cierre)
    prepTimeout: null,
    privateChannelId: null,
    panelMessageId: null,
    copyMessageId: null,        // mensaje copiable que se va actualizando
    guildId: null,
  };
}

export function bandosParaRonda(state, ronda) {
  // ronda 1 = config inicial; ronda 2 = invertidos; etc.
  if (ronda % 2 === 1) return { atk: state.sedeAtk, dfn: state.sedeDef };
  return { atk: state.sedeDef, dfn: state.sedeAtk };
}

export function marcadorStr(state) {
  return `**${state.sedeAtk.name} ${state.score[state.sedeAtk.name] ?? 0} - ${state.score[state.sedeDef.name] ?? 0} ${state.sedeDef.name}**`;
}

export function hayEmpateFinal(state) {
  return (
    state.currentRound >= 2 &&
    (state.score[state.sedeAtk.name] ?? 0) === (state.score[state.sedeDef.name] ?? 0)
  );
}

export function staffMentions(state) {
  if (!state.staffIds.length) return "_Sin staff asignado_";
  return state.staffIds.map((id) => `<@${id}>`).join(" ");
}
