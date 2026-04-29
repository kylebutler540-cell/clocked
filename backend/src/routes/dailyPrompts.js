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
    let results = null;

    if (req.user) {
      // Check if user already responded today FOR THIS INDUSTRY
      const existing = await prisma.$queryRawUnsafe(
        `SELECT response_value FROM prompt_responses WHERE prompt_date = $1 AND user_id = $2 AND industry = $3 LIMIT 1`,
        dateStr, req.user.id, industry
      );
      if (existing && existing.length > 0) {
        userResponse = existing[0].response_value;
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

    // Upsert — keyed on (prompt_date, user_id, industry) so each tab is independent
    const ind = industry || 'general';
    const existing = await prisma.$queryRawUnsafe(
      `SELECT id FROM prompt_responses WHERE prompt_date = $1 AND user_id = $2 AND industry = $3 LIMIT 1`,
      dateStr, req.user.id, ind
    );

    if (existing && existing.length > 0) {
      await prisma.$queryRawUnsafe(
        `UPDATE prompt_responses SET response_value = $1 WHERE prompt_date = $2 AND user_id = $3 AND industry = $4`,
        value, dateStr, req.user.id, ind
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
    const prompt = getTodayPrompt();
    const dateStr = getTodayDateStr();

    const posts = [];

    for (const ind of INDUSTRIES) {
      const question = getPromptText(prompt, ind.key);
      const pollOptions = getPollOptions(prompt, ind.key);

      // Aggregate results for this industry
      const allResponses = await prisma.$queryRawUnsafe(
        `SELECT response_value, COUNT(*) as count FROM prompt_responses WHERE prompt_date = $1 AND industry = $2 GROUP BY response_value`,
        dateStr, ind.key
      );
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
      });
    }

    // Sort: user's occupation first
    posts.sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0));

    res.json({ date: dateStr, promptId: prompt.id, userOccupation, posts });
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
