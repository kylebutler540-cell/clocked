/**
 * Two-layer cache: in-memory (fast) + localStorage (persists across page loads).
 * Strategy: stale-while-revalidate — show cached instantly, refresh in background.
 */

const store = new Map(); // key → { data, ts }
const MEM_TTL = 60 * 1000;        // 60s in-memory freshness
const LS_TTL  = 5 * 60 * 1000;   // 5min localStorage freshness
const LS_PREFIX = 'clocked_c_';   // localStorage key prefix

// ── In-memory ────────────────────────────────────────────────────────────────
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
  return Date.now() - entry.ts < MEM_TTL;
}

// ── Persistent (localStorage) ─────────────────────────────────────────────────
// Use for: user profiles, follower/following lists, inbox
export function lsGet(key) {
  try {
    const raw = localStorage.getItem(LS_PREFIX + key);
    if (!raw) return null;
    const entry = JSON.parse(raw);
    return entry.data ?? null;
  } catch { return null; }
}

export function lsSet(key, data) {
  try {
    localStorage.setItem(LS_PREFIX + key, JSON.stringify({ data, ts: Date.now() }));
  } catch { /* storage full — ignore */ }
}

export function lsIsFresh(key, ttl = LS_TTL) {
  try {
    const raw = localStorage.getItem(LS_PREFIX + key);
    if (!raw) return false;
    const entry = JSON.parse(raw);
    return Date.now() - entry.ts < ttl;
  } catch { return false; }
}

export function lsDelete(key) {
  try { localStorage.removeItem(LS_PREFIX + key); } catch {}
}

export function lsClear(prefix) {
  try {
    const keys = Object.keys(localStorage).filter(k => k.startsWith(LS_PREFIX + (prefix || '')));
    keys.forEach(k => localStorage.removeItem(k));
  } catch {}
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
