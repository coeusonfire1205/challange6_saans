/** Bounded FIFO cache. Expired entries never count as successful cache hits. */
export class TTLCache {
  #entries = new Map();
  constructor(capacity, ttlMs, now = Date.now) {
    if (!Number.isInteger(capacity) || capacity < 1 || !(ttlMs > 0)) {
      throw new RangeError('Cache capacity and lifetime must be positive');
    }
    this.capacity = capacity;
    this.ttlMs = ttlMs;
    this.now = now;
  }
  get(key) {
    const entry = this.#entries.get(key);
    if (!entry) return undefined;
    if (this.now() - entry.createdAt >= this.ttlMs) {
      this.#entries.delete(key);
      return undefined;
    }
    return entry.value;
  }
  set(key, value) {
    this.#entries.delete(key);
    if (this.#entries.size >= this.capacity) {
      this.#entries.delete(this.#entries.keys().next().value);
    }
    this.#entries.set(key, { value, createdAt: this.now() });
  }
}
