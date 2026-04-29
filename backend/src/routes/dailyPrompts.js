const express = require('express');
const { v4: uuidv4 } = require('uuid');
const prisma = require('../lib/prisma');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const { getTodayPrompt, getPromptText, getPollOptions, getTodayDateStr } = require('../data/prompts');

const router = express.Router();

// GET /api/daily-prompts/today
// Returns today's prompt + user's response (if any) + results (if user responded)
router.get('/today', optionalAuth, async (req, res) => {
  try {
    const industry = req.query.industry || 'general';
    const prompt = getTodayPrompt();
    const dateStr = getTodayDateStr();

    const question = getPromptText(prompt, industry);
    const pollOptions = getPollOptions(prompt, industry);

    let userResponse = null;
    let hasVotedToday = false;
    let votedOccupation = null;
    let results = null;

    if (req.user) {
      // Check if user has voted today at all (one global vote per day)
      const existing = await prisma.$queryRawUnsafe(
        `SELECT response_value, industry FROM prompt_responses WHERE prompt_date = $1 AND user_id = $2 LIMIT 1`,
        dateStr, req.user.id
      );
      if (existing && existing.length > 0) {
        hasVotedToday = true;
        votedOccupation = existing[0].industry;
        // Only show their answer if this tab matches the occupation they voted under
        if (existing[0].industry === industry) {
          userResponse = existing[0].response_value;
        }
      }
    }

    // Fetch results if user responded (or always show total count)
    const allResponses = await prisma.$queryRawUnsafe(
      `SELECT response_value, COUNT(*) as count FROM prompt_responses WHERE prompt_date = $1 GROUP BY response_value`,
      dateStr
    );

    const totalResponses = allResponses.reduce((sum, r) => sum + Number(r.count), 0);

    if (userResponse !== null) {
      // Build results object
      const resultMap = {};
      allResponses.forEach(r => { resultMap[r.response_value] = Number(r.count); });

      if (prompt.responseType === 'yesno') {
        const yesCount = resultMap['yes'] || 0;
        const noCount = resultMap['no'] || 0;
        const total = yesCount + noCount;
        results = {
          yes: { count: yesCount, pct: total > 0 ? Math.round((yesCount / total) * 100) : 0 },
          no:  { count: noCount,  pct: total > 0 ? Math.round((noCount  / total) * 100) : 0 },
        };
      } else if (prompt.responseType === 'slider') {
        const buckets = ['1','2','3','4','5'];
        const total = buckets.reduce((s, v) => s + (resultMap[v] || 0), 0);
        results = {};
        buckets.forEach(v => {
          const count = resultMap[v] || 0;
          results[v] = { count, pct: total > 0 ? Math.round((count / total) * 100) : 0 };
        });
      } else if (prompt.responseType === 'poll') {
        const opts = pollOptions || [];
        const total = opts.reduce((s, o) => s + (resultMap[o] || 0), 0);
        results = {};
        opts.forEach(o => {
          const count = resultMap[o] || 0;
          results[o] = { count, pct: total > 0 ? Math.round((count / total) * 100) : 0 };
        });
      }
    }

    // Streak
    let streak = 0;
    if (req.user) {
      streak = await getUserStreak(req.user.id);
    }

    res.json({
      date: dateStr,
      promptId: prompt.id,
      category: prompt.category,
      responseType: prompt.responseType,
      hook: prompt.hook,
      question,
      pollOptions,
      userResponse,
      hasVotedToday,
      votedOccupation,
      results,
      totalResponses,
      streak,
    });
  } catch (err) {
    console.error('Daily prompt error:', err);
    res.status(500).json({ error: 'Failed to load prompt' });
  }
});

// POST /api/daily-prompts/today/respond
router.post('/today/respond', requireAuth, async (req, res) => {
  try {
    const { value, industry } = req.body;
    if (!value) return res.status(400).json({ error: 'value required' });

    const prompt = getTodayPrompt();
    const dateStr = getTodayDateStr();

    // Validate response value
    if (prompt.responseType === 'yesno' && !['yes','no'].includes(value)) {
      return res.status(400).json({ error: 'Invalid response' });
    }
    if (prompt.responseType === 'slider' && !['1','2','3','4','5'].includes(value)) {
      return res.status(400).json({ error: 'Invalid slider value' });
    }

    // One vote per user per day globally
    const ind = industry || 'general';
    const existing = await prisma.$queryRawUnsafe(
      `SELECT id, industry FROM prompt_responses WHERE prompt_date = $1 AND user_id = $2 LIMIT 1`,
      dateStr, req.user.id
    );

    if (existing && existing.length > 0) {
      // Already voted — reject if different occupation; allow same occupation re-vote
      if (existing[0].industry !== ind) {
        return res.status(409).json({ error: 'already_voted', votedOccupation: existing[0].industry });
      }
      // Same occupation — update answer
      await prisma.$queryRawUnsafe(
        `UPDATE prompt_responses SET response_value = $1 WHERE prompt_date = $2 AND user_id = $3`,
        value, dateStr, req.user.id
      );
    } else {
      await prisma.$queryRawUnsafe(
        `INSERT INTO prompt_responses (id, prompt_date, prompt_id, user_id, response_value, industry, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        uuidv4(), dateStr, String(prompt.id), req.user.id, value, ind
      );
    }

    // Fetch updated results
    const allResponses = await prisma.$queryRawUnsafe(
      `SELECT response_value, COUNT(*) as count FROM prompt_responses WHERE prompt_date = $1 GROUP BY response_value`,
      dateStr
    );
    const totalResponses = allResponses.reduce((sum, r) => sum + Number(r.count), 0);
    const resultMap = {};
    allResponses.forEach(r => { resultMap[r.response_value] = Number(r.count); });

    const pollOptions = getPollOptions(prompt, industry || 'general');
    let results = {};

    if (prompt.responseType === 'yesno') {
      const y = resultMap['yes'] || 0, n = resultMap['no'] || 0, t = y + n;
      results = {
        yes: { count: y, pct: t > 0 ? Math.round((y/t)*100) : 0 },
        no:  { count: n, pct: t > 0 ? Math.round((n/t)*100) : 0 },
      };
    } else if (prompt.responseType === 'slider') {
      const t = ['1','2','3','4','5'].reduce((s,v) => s+(resultMap[v]||0), 0);
      ['1','2','3','4','5'].forEach(v => {
        const c = resultMap[v] || 0;
        results[v] = { count: c, pct: t > 0 ? Math.round((c/t)*100) : 0 };
      });
    } else if (prompt.responseType === 'poll') {
      const opts = pollOptions || [];
      const t = opts.reduce((s,o) => s+(resultMap[o]||0), 0);
      opts.forEach(o => {
        const c = resultMap[o] || 0;
        results[o] = { count: c, pct: t > 0 ? Math.round((c/t)*100) : 0 };
      });
    }

    const streak = await getUserStreak(req.user.id);

    res.json({ userResponse: value, results, totalResponses, streak });
  } catch (err) {
    console.error('Prompt respond error:', err);
    res.status(500).json({ error: 'Failed to save response' });
  }
});

// GET /api/daily-prompts/streak
router.get('/streak', requireAuth, async (req, res) => {
  try {
    const streak = await getUserStreak(req.user.id);
    res.json({ streak });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch streak' });
  }
});

// ── Feed & Reactions ─────────────────────────────────────────────────────────────

const INDUSTRIES = [
  { key: 'general',    label: 'General',               emoji: '🌐' },
  { key: 'restaurant', label: 'Food & Restaurant',     emoji: '🍽️' },
  { key: 'retail',     label: 'Retail & Sales',        emoji: '🛒' },
  { key: 'hvac',       label: 'Trades & HVAC',         emoji: '🔧' },
  { key: 'office',     label: 'Office & Corporate',    emoji: '💼' },
  { key: 'warehouse',  label: 'Warehouse & Logistics', emoji: '📦' },
  { key: 'healthcare', label: 'Healthcare',            emoji: '🏥' },
];

// GET /api/daily-prompts/feed
router.get('/feed', optionalAuth, async (req, res) => {
  try {
    const userOccupation = req.query.occupation || 'general';
    const filter = req.query.filter || 'all'; // 'all' | 'friends' | 'top'
    const prompt = getTodayPrompt();
    const dateStr = getTodayDateStr();

    // For friends filter: get mutual follower IDs
    let friendIds = [];
    if (filter === 'friends' && req.user) {
      const mutual = await prisma.$queryRawUnsafe(
        `SELECT f1.follower_id as friend_id
         FROM follows f1
         JOIN follows f2 ON f2.follower_id = $1 AND f2.following_id = f1.follower_id
         WHERE f1.following_id = $1`,
        req.user.id
      );
      friendIds = mutual.map(r => r.friend_id);
    }

    const posts = [];

    for (const ind of INDUSTRIES) {
      const question = getPromptText(prompt, ind.key);
      const pollOptions = getPollOptions(prompt, ind.key);

      // Aggregate results for this industry (filtered by friends if needed)
      let allResponses;
      if (filter === 'friends' && friendIds.length > 0) {
        const placeholders = friendIds.map((_, i) => `$${i + 3}`).join(',');
        allResponses = await prisma.$queryRawUnsafe(
          `SELECT response_value, COUNT(*) as count FROM prompt_responses WHERE prompt_date = $1 AND industry = $2 AND user_id IN (${placeholders}) GROUP BY response_value`,
          dateStr, ind.key, ...friendIds
        );
      } else if (filter === 'friends' && friendIds.length === 0) {
        allResponses = [];
      } else {
        allResponses = await prisma.$queryRawUnsafe(
          `SELECT response_value, COUNT(*) as count FROM prompt_responses WHERE prompt_date = $1 AND industry = $2 GROUP BY response_value`,
          dateStr, ind.key
        );
      }

      // Friends who answered this occupation (for avatars)
      let friendResponses = [];
      if (filter === 'friends' && friendIds.length > 0) {
        const placeholders = friendIds.map((_, i) => `$${i + 3}`).join(',');
        const rows = await prisma.$queryRawUnsafe(
          `SELECT pr.response_value, u.anon_number, u.avatar_url
           FROM prompt_responses pr
           JOIN users u ON u.id = pr.user_id
           WHERE pr.prompt_date = $1 AND pr.industry = $2 AND pr.user_id IN (${placeholders})
           LIMIT 10`,
          dateStr, ind.key, ...friendIds
        );
        friendResponses = rows;
      }
      const total = allResponses.reduce((s, r) => s + Number(r.count), 0);
      const resultMap = {};
      allResponses.forEach(r => { resultMap[r.response_value] = Number(r.count); });

      let results = {};
      if (prompt.responseType === 'yesno') {
        const y = resultMap['yes'] || 0, n = resultMap['no'] || 0, t = y + n;
        results = {
          yes: { count: y, pct: t > 0 ? Math.round((y / t) * 100) : 0 },
          no:  { count: n, pct: t > 0 ? Math.round((n / t) * 100) : 0 },
        };
      } else if (prompt.responseType === 'slider') {
        const t = ['1','2','3','4','5'].reduce((s,v) => s+(resultMap[v]||0), 0);
        ['1','2','3','4','5'].forEach(v => { const c = resultMap[v]||0; results[v] = { count: c, pct: t>0?Math.round((c/t)*100):0 }; });
      } else if (prompt.responseType === 'poll') {
        const opts = pollOptions || [];
        const t = opts.reduce((s,o) => s+(resultMap[o]||0), 0);
        opts.forEach(o => { const c = resultMap[o]||0; results[o] = { count: c, pct: t>0?Math.round((c/t)*100):0 }; });
      }

      // Reaction counts
      const reactions = await prisma.$queryRawUnsafe(
        `SELECT type, COUNT(*) as count FROM daily_prompt_reactions WHERE prompt_date = $1 AND occupation = $2 GROUP BY type`,
        dateStr, ind.key
      );
      const reactionMap = {};
      reactions.forEach(r => { reactionMap[r.type] = Number(r.count); });

      // Comment count
      const commentCountRows = await prisma.$queryRawUnsafe(
        `SELECT COUNT(*) as count FROM daily_prompt_comments WHERE prompt_date = $1 AND occupation = $2`,
        dateStr, ind.key
      );
      const commentCount = Number(commentCountRows[0]?.count || 0);

      // User-specific data
      let userResponse = null;
      let userLiked = false;
      let userDisliked = false;
      let userSaved = false;
      if (req.user) {
        const ur = await prisma.$queryRawUnsafe(
          `SELECT response_value FROM prompt_responses WHERE prompt_date = $1 AND user_id = $2 AND industry = $3 LIMIT 1`,
          dateStr, req.user.id, ind.key
        );
        if (ur && ur.length > 0) userResponse = ur[0].response_value;

        const ur2 = await prisma.$queryRawUnsafe(
          `SELECT type FROM daily_prompt_reactions WHERE prompt_date = $1 AND occupation = $2 AND user_id = $3`,
          dateStr, ind.key, req.user.id
        );
        ur2.forEach(r => {
          if (r.type === 'like') userLiked = true;
          if (r.type === 'dislike') userDisliked = true;
          if (r.type === 'save') userSaved = true;
        });
      }

      // Get or create a real Post record so CommentSheet can be used directly
      let postId = null;
      try {
        const existingPost = await prisma.$queryRawUnsafe(
          `SELECT post_id FROM daily_prompt_post_ids WHERE prompt_date = $1 AND occupation = $2 LIMIT 1`,
          dateStr, ind.key
        );
        if (existingPost && existingPost.length > 0) {
          postId = existingPost[0].post_id;
        } else {
          postId = uuidv4();
          await prisma.$queryRawUnsafe(
            `INSERT INTO posts (id, anonymous_user_id, employer_place_id, employer_name, employer_address, rating_emoji, body, media_urls, likes, dislikes, created_at, updated_at)
             VALUES ($1, 'dp-system-user', $2, $3, 'Clocked Daily Prompts', 'NEUTRAL', $4, '{}', 0, 0, NOW(), NOW())`,
            postId, `dp_${dateStr}_${ind.key}`, ind.label, question
          );
          await prisma.$queryRawUnsafe(
            `INSERT INTO daily_prompt_post_ids (prompt_date, occupation, post_id) VALUES ($1, $2, $3)`,
            dateStr, ind.key, postId
          );
        }
      } catch (e) {
        // non-fatal — comments just won't work for this post
        console.error('Post ID creation failed:', e.message);
      }

      posts.push({
        occupation: ind.key,
        occupationLabel: ind.label,
        occupationEmoji: ind.emoji,
        question,
        hook: prompt.hook,
        responseType: prompt.responseType,
        pollOptions,
        userResponse,
        results,
        totalResponses: total,
        likeCount: reactionMap['like'] || 0,
        dislikeCount: reactionMap['dislike'] || 0,
        saveCount: reactionMap['save'] || 0,
        commentCount,
        userLiked,
        userDisliked,
        userSaved,
        isPinned: ind.key === userOccupation,
        category: prompt.category,
        friendResponses,
        postId,
      });
    }

    // Friends filter: keep only posts where friends voted (always keep user's own pinned post)
    let filtered = posts;
    if (filter === 'friends') {
      filtered = posts.filter(p => p.isPinned || p.friendResponses.length > 0);
    }

    // Sort
    filtered.sort((a, b) => {
      if (b.isPinned !== a.isPinned) return (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0);
      if (filter === 'top') {
        // Use global totalResponses for most-votes sort — re-query needed
        return b.totalResponses - a.totalResponses;
      }
      return 0;
    });

    res.json({ date: dateStr, promptId: prompt.id, userOccupation, filter, posts: filtered });
  } catch (err) {
    console.error('Feed error:', err);
    res.status(500).json({ error: 'Failed to load feed' });
  }
});

// POST /api/daily-prompts/feed/:date/:occupation/react
router.post('/feed/:date/:occupation/react', requireAuth, async (req, res) => {
  try {
    const { date, occupation } = req.params;
    const { type } = req.body;
    if (!['like', 'save'].includes(type)) return res.status(400).json({ error: 'type must be like or save' });

    // Toggle
    const existing = await prisma.$queryRawUnsafe(
      `SELECT id FROM daily_prompt_reactions WHERE prompt_date = $1 AND occupation = $2 AND user_id = $3 AND type = $4 LIMIT 1`,
      date, occupation, req.user.id, type
    );
    if (existing && existing.length > 0) {
      await prisma.$queryRawUnsafe(
        `DELETE FROM daily_prompt_reactions WHERE prompt_date = $1 AND occupation = $2 AND user_id = $3 AND type = $4`,
        date, occupation, req.user.id, type
      );
    } else {
      await prisma.$queryRawUnsafe(
        `INSERT INTO daily_prompt_reactions (id, prompt_date, occupation, user_id, type, created_at) VALUES ($1,$2,$3,$4,$5,NOW())`,
        uuidv4(), date, occupation, req.user.id, type
      );
    }

    // Return updated counts + user state
    const counts = await prisma.$queryRawUnsafe(
      `SELECT type, COUNT(*) as count FROM daily_prompt_reactions WHERE prompt_date = $1 AND occupation = $2 GROUP BY type`,
      date, occupation
    );
    const cmap = {};
    counts.forEach(r => { cmap[r.type] = Number(r.count); });
    const userReacts = await prisma.$queryRawUnsafe(
      `SELECT type FROM daily_prompt_reactions WHERE prompt_date = $1 AND occupation = $2 AND user_id = $3`,
      date, occupation, req.user.id
    );
    const userTypes = new Set(userReacts.map(r => r.type));

    res.json({
      liked: userTypes.has('like'),
      disliked: userTypes.has('dislike'),
      saved: userTypes.has('save'),
      likeCount: cmap['like'] || 0,
      dislikeCount: cmap['dislike'] || 0,
      saveCount: cmap['save'] || 0,
    });
  } catch (err) {
    console.error('React error:', err);
    res.status(500).json({ error: 'Failed to react' });
  }
});

// GET /api/daily-prompts/feed/:date/:occupation/comments
router.get('/feed/:date/:occupation/comments', optionalAuth, async (req, res) => {
  try {
    const { date, occupation } = req.params;
    const rows = await prisma.$queryRawUnsafe(
      `SELECT c.id, c.body, c.created_at, u.anon_number
       FROM daily_prompt_comments c
       JOIN users u ON u.id = c.user_id
       WHERE c.prompt_date = $1 AND c.occupation = $2
       ORDER BY c.created_at ASC
       LIMIT 100`,
      date, occupation
    );
    res.json({ comments: rows });
  } catch (err) {
    console.error('Comments fetch error:', err);
    res.status(500).json({ error: 'Failed to load comments' });
  }
});

// POST /api/daily-prompts/feed/:date/:occupation/comments
router.post('/feed/:date/:occupation/comments', requireAuth, async (req, res) => {
  try {
    const { date, occupation } = req.params;
    const { body } = req.body;
    if (!body || !body.trim()) return res.status(400).json({ error: 'body required' });
    const id = uuidv4();
    await prisma.$queryRawUnsafe(
      `INSERT INTO daily_prompt_comments (id, prompt_date, occupation, user_id, body, created_at) VALUES ($1,$2,$3,$4,$5,NOW())`,
      id, date, occupation, req.user.id, body.trim()
    );
    // Return new comment with anon_number
    const rows = await prisma.$queryRawUnsafe(
      `SELECT c.id, c.body, c.created_at, u.anon_number FROM daily_prompt_comments c JOIN users u ON u.id = c.user_id WHERE c.id = $1`,
      id
    );
    res.json({ comment: rows[0] });
  } catch (err) {
    console.error('Comment post error:', err);
    res.status(500).json({ error: 'Failed to post comment' });
  }
});

// DELETE /api/daily-prompts/feed/:date/:occupation/comments/:id
router.delete('/feed/:date/:occupation/comments/:commentId', requireAuth, async (req, res) => {
  try {
    const { commentId } = req.params;
    await prisma.$queryRawUnsafe(
      `DELETE FROM daily_prompt_comments WHERE id = $1 AND user_id = $2`,
      commentId, req.user.id
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete comment' });
  }
});

// ── Helpers ────────────────────────────────────────────────────────────────────

async function getUserStreak(userId) {
  try {
    const rows = await prisma.$queryRawUnsafe(
      `SELECT prompt_date FROM prompt_responses WHERE user_id = $1 ORDER BY prompt_date DESC LIMIT 30`,
      userId
    );
    if (!rows || rows.length === 0) return 0;

    const today = getTodayDateStr();
    let streak = 0;
    let checkDate = today;

    for (const row of rows) {
      if (row.prompt_date === checkDate) {
        streak++;
        // Move to previous day
        const d = new Date(checkDate + 'T00:00:00Z');
        d.setUTCDate(d.getUTCDate() - 1);
        checkDate = d.toISOString().slice(0, 10);
      } else {
        break;
      }
    }
    return streak;
  } catch {
    return 0;
  }
}

module.exports = router;
