import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { checkRate } from "../src/rateLimit.js";

describe("rateLimit", () => {
  test("permite hasta el capacity y luego bloquea", () => {
    const key = `test-${Date.now()}-${Math.random()}`;
    const opts = { capacity: 3, refillPerSec: 0 };
    assert.ok(checkRate(key, opts).ok);
    assert.ok(checkRate(key, opts).ok);
    assert.ok(checkRate(key, opts).ok);
    const r = checkRate(key, opts);
    assert.equal(r.ok, false);
    assert.ok(r.retryAfterSec >= 0);
  });

  test("se rellena con el tiempo", async () => {
    const key = `test-refill-${Date.now()}`;
    const opts = { capacity: 1, refillPerSec: 100 }; // se rellena rápido para el test
    assert.ok(checkRate(key, opts).ok);
    assert.equal(checkRate(key, opts).ok, false);
    await new Promise((r) => setTimeout(r, 50));
    assert.ok(checkRate(key, opts).ok);
  });
});
