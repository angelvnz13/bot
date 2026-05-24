import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { TTLCache } from "../src/cache.js";

describe("TTLCache", () => {
  test("get/set/delete", () => {
    const c = new TTLCache(1000);
    c.set("a", 1);
    assert.equal(c.get("a"), 1);
    c.delete("a");
    assert.equal(c.get("a"), undefined);
  });

  test("expira tras TTL", async () => {
    const c = new TTLCache(20);
    c.set("a", 1);
    await new Promise((r) => setTimeout(r, 30));
    assert.equal(c.get("a"), undefined);
  });
});
