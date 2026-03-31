/**
 * Simple in-memory stale-while-revalidate cache.
 * Serves cached data instantly, refreshes in background.
 */

const store = new Map(); // key → { data, ts }
const TTL = 5 * 60 * 1000; // 5 minutes before treating as truly stale

export function cacheGet(key) {
  const entry = store.get(key);
  if (!entry) return null;
  return entry.data; // always return if exists (stale-while-revalidate)
}

export function cacheSet(key, data) {
  store.set(key, { data, ts: Date.now() });
}

export function cacheDelete(key) {
  store.delete(key);
}

export function cacheClear(prefix) {
  if (!prefix) { store.clear(); return; }
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key);
  }
}

export function isFresh(key) {
  const entry = store.get(key);
  if (!entry) return false;
  return Date.now() - entry.ts < TTL;
}
