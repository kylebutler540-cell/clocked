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
      // Check if user already responded today
      const existing = await prisma.$queryRawUnsafe(
        `SELECT response_value, industry FROM prompt_responses WHERE prompt_date = $1 AND user_id = $2 LIMIT 1`,
        dateStr, req.user.id
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

    // Upsert — allows changing today's response
    const existing = await prisma.$queryRawUnsafe(
      `SELECT id FROM prompt_responses WHERE prompt_date = $1 AND user_id = $2 LIMIT 1`,
      dateStr, req.user.id
    );

    if (existing && existing.length > 0) {
      await prisma.$queryRawUnsafe(
        `UPDATE prompt_responses SET response_value = $1, industry = $2 WHERE prompt_date = $3 AND user_id = $4`,
        value, industry || 'general', dateStr, req.user.id
      );
    } else {
      await prisma.$queryRawUnsafe(
        `INSERT INTO prompt_responses (id, prompt_date, prompt_id, user_id, response_value, industry, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        uuidv4(), dateStr, String(prompt.id), req.user.id, value, industry || 'general'
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
