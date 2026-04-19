/**
 * postStore — global single source of truth for post reaction/count state.
 *
 * KEY DESIGN RULES:
 * 1. seedPost() only runs on mount and when genuine NEW server data arrives.
 *    It never runs during an in-flight vote. The store owns the count/reaction
 *    during a vote cycle; the server response is the final word.
 * 2. All PostCard renders read ONLY from the store for likes/dislikes/liked/disliked.
 *    Never merge initialPost reaction fields at render time — they are stale cache.
 * 3. One vote lock per post. While locked, any additional taps are silently dropped.
 *    The lock is released when the server responds (success or failure).
 */

// postId → { likes, dislikes, liked, disliked, saved, comment_count }
const _store = new Map();

// postId → Set<fn> — React subscribers
const _listeners = new Map();

// postId → true while a vote request is in-flight
const _voting = new Set();

// ── Internal ──────────────────────────────────────────────────────────────────

function _notify(postId) {
  const subs = _listeners.get(postId);
  if (!subs) return;
  const state = _store.get(postId);
  subs.forEach(fn => fn(state));
}

function _clamp(v) {
  return Math.max(0, Number.isFinite(v) ? v : 0);
}

function _set(postId, patch) {
  const existing = _store.get(postId) || {};
  const next = { ...existing, ...patch };
  next.likes         = _clamp(next.likes);
  next.dislikes      = _clamp(next.dislikes);
  next.comment_count = _clamp(next.comment_count);
  _store.set(postId, next);
  _notify(postId);
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Seed server data into the store.
 * SAFE to call on mount and when server refetches arrive.
 * SKIPPED if a vote is in-flight (prevents stale data clobbering optimistic state).
 */
export function seedPost(post) {
  if (!post?.id) return;
  // Never overwrite store while a vote is processing
  if (_voting.has(post.id)) return;
  _store.set(post.id, {
    likes:         _clamp(post.likes),
    dislikes:      _clamp(post.dislikes),
    liked:         !!post.liked,
    disliked:      !!post.disliked,
    saved:         !!post.saved,
    comment_count: _clamp(post.comment_count),
  });
  // Don't notify here — this is called from render, notification happens via React state
}

/**
 * Subscribe a React component to store updates for a post.
 * Returns an unsubscribe function.
 */
export function subscribe(postId, fn) {
  if (!_listeners.has(postId)) _listeners.set(postId, new Set());
  _listeners.get(postId).add(fn);
  return () => {
    _listeners.get(postId)?.delete(fn);
  };
}

/** Get current store snapshot for a post. Returns null if not seeded yet. */
export function getPost(postId) {
  return _store.get(postId) ?? null;
}

/**
 * Attempt to acquire the vote lock for a post.
 * Returns true if acquired (caller should proceed), false if already locked (drop the tap).
 */
export function acquireVoteLock(postId) {
  if (_voting.has(postId)) return false;
  _voting.add(postId);
  return true;
}

/**
 * Apply an optimistic update during a vote.
 * Only called AFTER the lock is acquired.
 */
export function optimisticVote(postId, patch) {
  _set(postId, patch);
}

/**
 * Apply server response after a successful vote. Releases lock.
 * Server data is always the final word on counts and reaction state.
 */
export function commitVote(postId, serverData) {
  _voting.delete(postId);
  _set(postId, {
    likes:    _clamp(serverData.likes),
    dislikes: _clamp(serverData.dislikes),
    liked:    !!serverData.liked,
    disliked: !!serverData.disliked,
  });
}

/**
 * Revert to a snapshot after a failed vote. Releases lock.
 */
export function rollbackVote(postId, snapshot) {
  _voting.delete(postId);
  _set(postId, snapshot);
}

/** Update comment count by delta (+1 or -1). */
export function updateCommentCount(postId, delta) {
  const s = _store.get(postId);
  if (!s) return;
  _set(postId, { comment_count: s.comment_count + delta });
}

/** Update saved state. */
export function updateSaved(postId, saved) {
  const s = _store.get(postId);
  if (!s) return;
  _set(postId, { saved });
}

/** Clear everything on logout / account switch. */
export function clearPostStore() {
  _store.clear();
  _voting.clear();
  // Keep listeners — components will re-seed on next render
}
