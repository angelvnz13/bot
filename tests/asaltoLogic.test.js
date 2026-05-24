import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  bandosParaRonda,
  hayEmpateFinal,
  marcadorStr,
  newAsaltoState,
} from "../src/interactions/asalto.js";

function makeState() {
  const s = newAsaltoState("user-1");
  s.sedeAtk = { id: 1, name: "Norte", coords: "" };
  s.sedeDef = { id: 2, name: "Sur", coords: "" };
  s.score = { Norte: 0, Sur: 0 };
  return s;
}

describe("lógica del asalto", () => {
  test("bandos cambian cada ronda", () => {
    const s = makeState();
    const r1 = bandosParaRonda(s, 1);
    assert.equal(r1.atk.name, "Norte");
    assert.equal(r1.dfn.name, "Sur");
    const r2 = bandosParaRonda(s, 2);
    assert.equal(r2.atk.name, "Sur");
    assert.equal(r2.dfn.name, "Norte");
    const r3 = bandosParaRonda(s, 3);
    assert.equal(r3.atk.name, "Norte");
  });

  test("marcador se renderiza correctamente", () => {
    const s = makeState();
    s.score.Norte = 1;
    s.score.Sur = 0;
    const out = marcadorStr(s);
    assert.match(out, /Norte 1 - 0 Sur/);
  });

  test("empate final tras ronda 2", () => {
    const s = makeState();
    s.currentRound = 2;
    s.score = { Norte: 1, Sur: 1 };
    assert.equal(hayEmpateFinal(s), true);
    s.score = { Norte: 2, Sur: 0 };
    assert.equal(hayEmpateFinal(s), false);
  });
});
