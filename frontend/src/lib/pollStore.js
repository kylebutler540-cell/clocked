/**
 * pollStore — in-memory cache of poll vote state for the current session.
 * When a user votes on a poll anywhere, the result is stored here and
 * any PollCard for that poll will reflect the voted state immediately,
 * even across different feed instances (home, company, profile, etc.)
 */

// pollId → updated poll object (with user_voted_option_id + vote_counts)
const _store = new Map();

// pollId → Set<fn>
const _listeners = new Map();

export function seedPoll(pollId, pollData) {
  if (!pollId || !pollData) return;
  // Only seed if not already voted (don't overwrite a live vote with stale feed data)
  if (_store.has(pollId)) return;
  _store.set(pollId, pollData);
}

export function getVotedPoll(pollId) {
  return _store.get(pollId) ?? null;
}

export function recordVote(pollId, updatedPoll) {
  if (!pollId || !updatedPoll) return;
  _store.set(pollId, updatedPoll);
  const subs = _listeners.get(pollId);
  if (subs) subs.forEach(fn => fn(updatedPoll));
}

export function subscribePoll(pollId, fn) {
  if (!_listeners.has(pollId)) _listeners.set(pollId, new Set());
  _listeners.get(pollId).add(fn);
  return () => _listeners.get(pollId)?.delete(fn);
}

export function clearPollStore() {
  _store.clear();
}
