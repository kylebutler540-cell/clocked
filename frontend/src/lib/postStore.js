/**
 * postStore — single source of truth for post reaction state across all screens.
 *
 * Every PostCard reads from and writes to this store so that liking a post on
 * the company page instantly reflects on the home feed, profile view, etc.
 *
 * Architecture:
 *  - _store: Map<postId, { likes, dislikes, liked, disliked, saved, comment_count }>
 *  - _listeners: Map<postId, Set<fn>> — React components subscribe per-post
 *  - _pending: Set<postId> — lock: only one in-flight vote per post at a time
 */

const _store = new Map();       // postId → post fields (mutable)
const _listeners = new Map();   // postId → Set of subscriber callbacks
const _pending = new Set();     // postId → locked while a vote request is in-flight

// ── Internal helpers ──────────────────────────────────────────────────────────

function _notify(postId) {
  const subs = _listeners.get(postId);
  if (subs) subs.forEach(fn => fn(_store.get(postId)));
}

function _clamp(val) {
  return Math.max(0, typeof val === 'number' ? val : 0);
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Seed a post into the store (called by PostCard on mount with server data).
 * Only updates if the server data is "more authoritative" (liked/disliked set)
 * or if the post isn't in the store yet.
 */
export function seedPost(post) {
  const existing = _store.get(post.id);
  // If we have a pending vote in flight, don't let a stale server response clobber it
  if (_pending.has(post.id)) return;

  if (!existing) {
    _store.set(post.id, {
      likes: _clamp(post.likes),
      dislikes: _clamp(post.dislikes),
      liked: !!post.liked,
      disliked: !!post.disliked,
      saved: !!post.saved,
      comment_count: post.comment_count ?? 0,
    });
  } else {
    // Server returned explicit reaction state — trust it
    if (post.liked || post.disliked || (!post.liked && !post.disliked)) {
      _store.set(post.id, {
        ...existing,
        likes: _clamp(post.likes),
        dislikes: _clamp(post.dislikes),
        liked: !!post.liked,
        disliked: !!post.disliked,
        saved: post.saved !== undefined ? !!post.saved : existing.saved,
        comment_count: post.comment_count ?? existing.comment_count,
      });
    }
  }
}

/** Subscribe to changes for a specific post. Returns unsubscribe fn. */
export function subscribe(postId, fn) {
  if (!_listeners.has(postId)) _listeners.set(postId, new Set());
  _listeners.get(postId).add(fn);
  return () => _listeners.get(postId)?.delete(fn);
}

/** Get current store state for a post (or null). */
export function getPost(postId) {
  return _store.get(postId) || null;
}

/** Update specific fields for a post and notify subscribers. */
export function patchPost(postId, patch) {
  const existing = _store.get(postId);
  if (!existing) return;
  const updated = { ...existing, ...patch };
  // Always clamp counts
  updated.likes = _clamp(updated.likes);
  updated.dislikes = _clamp(updated.dislikes);
  updated.comment_count = _clamp(updated.comment_count);
  _store.set(postId, updated);
  _notify(postId);
}

/** Apply server truth after a vote completes. Clears lock. */
export function applyServerVote(postId, serverData) {
  _pending.delete(postId);
  const existing = _store.get(postId);
  if (!existing) return;
  _store.set(postId, {
    ...existing,
    likes: _clamp(serverData.likes),
    dislikes: _clamp(serverData.dislikes),
    liked: !!serverData.liked,
    disliked: !!serverData.disliked,
  });
  _notify(postId);
}

/** Revert to a previous snapshot after a failed vote. Clears lock. */
export function revertVote(postId, snapshot) {
  _pending.delete(postId);
  const existing = _store.get(postId);
  if (!existing) return;
  _store.set(postId, {
    ...existing,
    likes: _clamp(snapshot.likes),
    dislikes: _clamp(snapshot.dislikes),
    liked: !!snapshot.liked,
    disliked: !!snapshot.disliked,
  });
  _notify(postId);
}

/** Returns true if a vote request is already in-flight for this post. */
export function isVotePending(postId) {
  return _pending.has(postId);
}

/** Acquire the vote lock. Returns false if already locked. */
export function acquireVoteLock(postId) {
  if (_pending.has(postId)) return false;
  _pending.add(postId);
  return true;
}

/** Update comment count for a post. */
export function updateCommentCount(postId, delta) {
  const existing = _store.get(postId);
  if (!existing) return;
  _store.set(postId, {
    ...existing,
    comment_count: _clamp((existing.comment_count || 0) + delta),
  });
  _notify(postId);
}

/** Update saved state for a post. */
export function updateSaved(postId, saved) {
  patchPost(postId, { saved });
}

/** Clear the entire store (on logout/account switch). */
export function clearPostStore() {
  _store.clear();
  _pending.clear();
  // Don't clear listeners — components will re-seed on next render
}
