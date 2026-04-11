/**
 * In-memory cache with stale-while-revalidate.
 * Short TTL — we want fast initial renders, not long-lived stale data.
 */

const store = new Map(); // key → { data, ts }
const TTL = 30 * 1000; // 30 seconds — much shorter, keeps data fresh

export function cacheGet(key) {
  const entry = store.get(key);
  if (!entry) return null;
  return entry.data;
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

// Invalidate all caches related to a specific context
export function invalidateOnPost() {
  cacheClear('feed');
  cacheClear('posts');
  cacheDelete('notifications');
}

export function invalidateOnComment() {
  cacheClear('posts');
  cacheDelete('notifications');
}

export function invalidateOnLike() {
  cacheClear('posts');
}
