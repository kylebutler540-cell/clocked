/**
 * pollStore — per-session in-memory cache of poll vote state.
 *
 * IMPORTANT: this store is scoped to the current user session.
 * Call clearPollStore() on logout or account switch so votes from one
 * account never bleed into another account's session.
 *
 * Priority order (highest → lowest):
 *  1. recordVote() — user just voted in this tab (optimistic + confirmed)
 *  2. seedPoll()   — fresh server data (always trusted, overwrites stale cache)
 *  3. initialPoll  — feed/page prop (used by PollCard before store is seeded)
 */

// pollId → { pollData, votedByCurrentUser: bool }
const _store = new Map();

// pollId → Set<fn> — React subscribers
const _listeners = new Map();

// pollIds currently in an in-flight vote request (don't overwrite with stale seed)
const _inFlight = new Set();

function _notify(pollId, data) {
  const subs = _listeners.get(pollId);
  if (subs) subs.forEach(fn => fn(data));
}

/**
 * Seed with fresh server data.
 * Called every time a feed/page loads with new poll data from the API.
 * Always overwrites unless a vote request is currently in-flight for this poll.
 */
export function seedPoll(pollId, pollData) {
  if (!pollId || !pollData) return;
  // Don't overwrite while a vote is in-flight (would undo the optimistic update)
  if (_inFlight.has(pollId)) return;
  _store.set(pollId, pollData);
  // Don't notify listeners here — seeding is quiet; components re-render from props
}

/**
 * Get stored poll state for this poll.
 * Returns null if not yet seeded.
 */
export function getStoredPoll(pollId) {
  return _store.get(pollId) ?? null;
}

/**
 * Mark a vote as in-flight. Call before firing the API request.
 */
export function markVoteInFlight(pollId) {
  _inFlight.add(pollId);
}

/**
 * Record a confirmed (or optimistic) vote result.
 * Broadcasts to all PollCard instances showing this poll.
 */
export function recordVote(pollId, updatedPoll) {
  if (!pollId || !updatedPoll) return;
  _inFlight.delete(pollId);
  _store.set(pollId, updatedPoll);
  _notify(pollId, updatedPoll);
}

/**
 * Cancel an in-flight mark (e.g. on vote error — revert optimistic update).
 */
export function cancelVoteInFlight(pollId) {
  _inFlight.delete(pollId);
}

/**
 * Subscribe a PollCard to live updates for this poll.
 * Returns unsubscribe function.
 */
export function subscribePoll(pollId, fn) {
  if (!_listeners.has(pollId)) _listeners.set(pollId, new Set());
  _listeners.get(pollId).add(fn);
  return () => _listeners.get(pollId)?.delete(fn);
}

/**
 * Clear ALL poll state. MUST be called on logout and account switch.
 * Ensures one user's votes never leak into another user's session.
 */
export function clearPollStore() {
  _store.clear();
  _inFlight.clear();
  // Don't clear listeners — components re-subscribe on next render
}
