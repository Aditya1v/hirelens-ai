// ---------------------------------------------------------------------------
// simpleCache.js
//
// A deliberately minimal in-memory cache (Map + expiry timestamp) - no
// Redis, no extra infra. Fine for a single-instance deployment; documented
// as a scaling trade-off in the README. Used to avoid redundant external
// API calls (company autocomplete, job posting lookups) and redundant AI
// calls (duplicate analysis requests) within a TTL window.
// ---------------------------------------------------------------------------

export function createCache({ ttlMs = 5 * 60 * 1000, maxEntries = 500 } = {}) {
  const store = new Map();

  function get(key) {
    const entry = store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  function set(key, value) {
    if (store.size >= maxEntries) {
      // Evict the oldest entry - simple FIFO, good enough at this scale.
      const oldestKey = store.keys().next().value;
      store.delete(oldestKey);
    }
    store.set(key, { value, expiresAt: Date.now() + ttlMs });
  }

  return { get, set };
}
