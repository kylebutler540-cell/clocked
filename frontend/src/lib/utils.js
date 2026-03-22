export function timeAgo(dateStr) {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.floor((now - then) / 1000);

  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function ratingToEmoji(rating) {
  switch (rating) {
    case 'GOOD': return '😊';
    case 'NEUTRAL': return '😐';
    case 'BAD': return '😡';
    default: return '❓';
  }
}

export function ratingToLabel(rating) {
  switch (rating) {
    case 'GOOD': return 'Good';
    case 'NEUTRAL': return 'Neutral';
    case 'BAD': return 'Bad';
    default: return 'Unknown';
  }
}

export function generateAnonName(userId) {
  if (!userId) return 'Anonymous';
  const num = parseInt(userId.slice(-4), 16) % 9000 + 1000;
  return `Anonymous${num}`;
}

export function truncateAddress(address) {
  if (!address) return '';
  const parts = address.split(',');
  return parts.slice(0, 2).join(',').trim();
}
