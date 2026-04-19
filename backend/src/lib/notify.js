// Helper: create notifications silently (non-fatal)
const prisma = require('./prisma');

async function notify({ userId, type, message, data }) {
  if (!userId) return;
  try {
    await prisma.notification.create({
      data: { user_id: userId, type, message, data: data || {} },
    });
  } catch (e) { /* non-fatal */ }
}

/**
 * Upsert a reaction notification (like or dislike) so there is only ever
 * ONE notification per actor per post for the post owner.
 *
 * - If a reaction notification from this actor for this post already exists,
 *   it is updated in-place (type, message, timestamp refreshed).
 * - If the reaction is removed (newType = null), the existing notification is deleted.
 * - Never creates duplicate reaction notifications from rapid tapping.
 *
 * @param {object} opts
 * @param {string} opts.postOwnerId  - user_id of the post owner (notification recipient)
 * @param {string} opts.actorId      - user_id of the person reacting
 * @param {string} opts.postId       - the post being reacted to
 * @param {'like'|'dislike'|null} opts.newType - final reaction type, or null to remove
 * @param {string} opts.postHeader   - post title for notification text
 * @param {string|null} opts.postImage
 * @param {string|null} opts.actorName
 * @param {string|null} opts.actorAvatar
 */
async function upsertReactionNotify({ postOwnerId, actorId, postId, newType, postHeader, postImage, actorName, actorAvatar }) {
  // Never notify yourself
  if (!postOwnerId || postOwnerId === actorId) return;

  try {
    // Find existing reaction notification from this actor on this post
    const existing = await prisma.notification.findFirst({
      where: {
        user_id: postOwnerId,
        type: { in: ['like', 'dislike'] },
        data: {
          path: ['post_id'],
          equals: postId,
        },
        // Match by actor_id stored in data JSON
        AND: {
          data: {
            path: ['actor_id'],
            equals: actorId,
          },
        },
      },
    });

    if (newType === null) {
      // Reaction removed — delete the notification
      if (existing) {
        await prisma.notification.delete({ where: { id: existing.id } }).catch(() => {});
      }
      return;
    }

    const message = `${actorName || 'Someone'} ${newType === 'like' ? 'liked' : 'disliked'} your post.`;
    const data = {
      post_id: postId,
      post_header: postHeader,
      post_image: postImage ?? null,
      actor_id: actorId,
      actor_name: actorName ?? null,
      actor_avatar: actorAvatar ?? null,
    };

    if (existing) {
      // Update in-place — type may have changed (like → dislike or vice versa)
      await prisma.notification.update({
        where: { id: existing.id },
        data: { type: newType, message, data, read: false, created_at: new Date() },
      }).catch(() => {});
    } else {
      // First reaction from this actor on this post
      await prisma.notification.create({
        data: { user_id: postOwnerId, type: newType, message, data },
      }).catch(() => {});
    }
  } catch (e) { /* non-fatal */ }
}

module.exports = { notify, upsertReactionNotify };
