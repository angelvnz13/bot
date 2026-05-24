// Caché simple con TTL e invalidación manual.

export class TTLCache {
  constructor(ttlMs) {
    this.ttlMs = ttlMs;
    this.store = new Map(); // key -> { value, expires }
  }

  get(key) {
    const e = this.store.get(key);
    if (!e) return undefined;
    if (e.expires && e.expires < Date.now()) {
      this.store.delete(key);
      return undefined;
    }
    return e.value;
  }

  set(key, value) {
    this.store.set(key, { value, expires: this.ttlMs ? Date.now() + this.ttlMs : 0 });
  }

  delete(key) {
    this.store.delete(key);
  }

  clear() {
    this.store.clear();
  }
}
