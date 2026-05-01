const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const prisma = require('../lib/prisma');
const { requireAuth } = require('../middleware/auth');
const { generateUniqueAnonNumber } = require('../lib/anonNumber');

const router = express.Router();

const USERNAME_REGEX = /^[a-zA-Z0-9_.]{3,20}$/;

const PROFILE_SELECT = {
  id: true,
  email: true,
  anonymous_id: true,
  subscription_status: true,
  anon_number: true,
  created_at: true,
  display_name: true,
  username: true,
  avatar_url: true,
  follower_count: true,
  following_count: true,
  bio: true,
  workplace_name: true,
  workplace_place_id: true,
  workplace_address: true,
};

// Read workplaces via raw SQL — bypasses Prisma schema version issues
async function getRawWorkplaces(userId) {
  try {
    const rows = await prisma.$queryRawUnsafe(
      `SELECT workplaces FROM users WHERE id = $1`, userId
    );
    const arr = rows[0]?.workplaces || [];
    return arr.map(w => { try { return typeof w === 'string' ? JSON.parse(w) : w; } catch { return null; } }).filter(Boolean);
  } catch { return []; }
}

// Write workplaces via raw SQL — bypasses Prisma schema version issues
async function setRawWorkplaces(userId, workplacesArray) {
  // workplacesArray is [{name,place_id,address}, ...], store as JSON strings
  const jsonStrings = workplacesArray.slice(0, 3).map(w => JSON.stringify({
    name: w.name || '',
    place_id: w.place_id || null,
    address: w.address || null,
  }));
  await prisma.$executeRawUnsafe(
    `UPDATE users SET workplaces = $1::text[] WHERE id = $2`,
    jsonStrings,
    userId
  );
}

const ADMIN_EMAILS = ['kylebutler540@gmail.com', 'clockedreports@gmail.com'];

function formatUser(user, workplacesOverride) {
  let workplaces = [];
  if (workplacesOverride !== undefined) {
    workplaces = workplacesOverride;
  } else if (user.workplace_name) {
    workplaces = [{
      name: user.workplace_name,
      place_id: user.workplace_place_id || null,
      address: user.workplace_address || null,
    }];
  }

  return {
    id: user.id,
    email: user.email,
    is_admin: ADMIN_EMAILS.includes(user.email),
    anonymous_id: user.anonymous_id,
    subscription_status: user.subscription_status,
    anon_number: user.anon_number,
    created_at: user.created_at,
    display_name: user.display_name,
    username: user.username,
    avatar_url: user.avatar_url,
    follower_count: user.follower_count,
    following_count: user.following_count,
    bio: user.bio ?? null,
    workplace_name: user.workplace_name ?? null,
    workplace_place_id: user.workplace_place_id ?? null,
    workplace_address: user.workplace_address ?? null,
    workplaces,
  };
}

function generateAnonymousUsername() {
  const num = Math.floor(Math.random() * 9000) + 1000;
  return `Anonymous${num}`;
}

function signToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '90d' });
}

// Create anonymous session (no email required)
router.post('/anonymous', async (req, res) => {
  try {
    const anonNum = await generateUniqueAnonNumber();
    const user = await prisma.user.create({
      data: {
        anonymous_id: uuidv4(),
        anon_number: anonNum,
      },
    });
    const token = signToken(user.id);
    res.json({ token, user: { id: user.id, anonymous_id: user.anonymous_id, subscription_status: user.subscription_status, anon_number: user.anon_number } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create session' });
  }
});

// Check if email is already registered (used for real-time validation)
router.post('/check-email', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });
    const existing = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      select: { id: true, password_hash: true, google_id: true },
    });
    if (!existing) return res.json({ exists: false });
    // Has google_id but no password — must sign in with Google
    const googleOnly = !!existing.google_id && !existing.password_hash;
    res.json({ exists: true, googleOnly });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Check failed' });
  }
});

// Register with email (optional account upgrade)
router.post('/register', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: 'Email already in use' });
    }

    const password_hash = await bcrypt.hash(password, 12);
    const anonNum = await generateUniqueAnonNumber();
    const user = await prisma.user.create({
      data: {
        email,
        password_hash,
        anonymous_id: uuidv4(),
        anon_number: anonNum,
      },
    });

    const token = signToken(user.id);
    res.status(201).json({ token, user: formatUser(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    if (!user.password_hash) {
      // Account exists but was created via Google — no password set
      return res.status(401).json({ error: 'This account was created with Google. Please sign in with Google instead.', googleOnly: true });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Incorrect password' });
    }

    const token = signToken(user.id);
    res.json({ token, user: formatUser(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get public user info by userId
router.get('/user/:userId', async (req, res) => {
  try {
    const [user, rawWorkplaces] = await Promise.all([
      prisma.user.findUnique({
        where: { id: req.params.userId },
        select: {
          anon_number: true,
          display_name: true,
          username: true,
          avatar_url: true,
          follower_count: true,
          following_count: true,
          workplace_name: true,
          workplace_place_id: true,
          workplace_address: true,
        },
      }),
      getRawWorkplaces(req.params.userId),
    ]);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const workplaces = rawWorkplaces.length > 0 ? rawWorkplaces
      : (user.workplace_name ? [{ name: user.workplace_name, place_id: user.workplace_place_id || null, address: user.workplace_address || null }] : []);

    res.json({ ...user, workplaces });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Get current user
router.get('/me', requireAuth, async (req, res) => {
  try {
    const [user, postCount, workplaces] = await Promise.all([
      prisma.user.findUnique({ where: { id: req.user.id }, select: PROFILE_SELECT }),
      prisma.post.count({ where: { anonymous_user_id: req.user.id } }),
      getRawWorkplaces(req.user.id),
    ]);
    // If raw workplaces empty, fall back to legacy workplace_name
    const resolvedWorkplaces = workplaces.length > 0 ? workplaces
      : (user.workplace_name ? [{ name: user.workplace_name, place_id: user.workplace_place_id || null, address: user.workplace_address || null }] : []);
    res.json({ user: { ...formatUser(user, resolvedWorkplaces), post_count: postCount } });
  } catch (err) {
    console.error('/me error:', err);
    res.json({ user: { ...formatUser(req.user, []), post_count: 0 } });
  }
});

// Update profile (display_name, username, avatar_url, bio, workplaces)
router.patch('/profile', requireAuth, async (req, res) => {
  try {
    const { display_name, username, avatar_url, bio, workplaces, workplace_name, workplace_place_id, workplace_address } = req.body;
    const updateData = {};

    if (display_name !== undefined) {
      updateData.display_name = display_name ? display_name.trim() : null;
    }

    if (username !== undefined) {
      if (username) {
        if (!USERNAME_REGEX.test(username)) {
          return res.status(400).json({ error: 'Username must be 3-20 characters: letters, numbers, underscores, or periods only' });
        }
        // Check uniqueness (exclude current user)
        const existing = await prisma.user.findFirst({
          where: { username, NOT: { id: req.user.id } },
        });
        if (existing) {
          return res.status(409).json({ error: 'Username already taken' });
        }
        updateData.username = username;
      } else {
        updateData.username = null;
      }
    }

    if (avatar_url !== undefined) {
      updateData.avatar_url = avatar_url || null;
    }

    if (bio !== undefined) {
      updateData.bio = bio ? bio.slice(0, 150).trim() : null;
    }

    // Handle workplaces — sync legacy columns AND store in raw workplaces column
    let newWorkplacesArray = undefined; // undefined = don't update workplaces
    if (workplaces !== undefined) {
      const limited = Array.isArray(workplaces) ? workplaces.slice(0, 3) : [];
      newWorkplacesArray = limited;
      // Sync first job to legacy columns (backwards compat)
      if (limited.length > 0) {
        updateData.workplace_name = limited[0].name || null;
        updateData.workplace_place_id = limited[0].place_id || null;
        updateData.workplace_address = limited[0].address || null;
      } else {
        updateData.workplace_name = null;
        updateData.workplace_place_id = null;
        updateData.workplace_address = null;
      }
    } else if (workplace_name !== undefined) {
      // Backwards compat: old single-workplace API
      updateData.workplace_name = workplace_name || null;
      updateData.workplace_place_id = workplace_place_id || null;
      updateData.workplace_address = workplace_address || null;
      newWorkplacesArray = workplace_name
        ? [{ name: workplace_name, place_id: workplace_place_id || null, address: workplace_address || null }]
        : [];
    }

    // Update non-workplaces fields via Prisma
    await prisma.user.update({
      where: { id: req.user.id },
      data: updateData,
    });

    // Update workplaces via raw SQL (bypasses any Prisma schema version issues)
    if (newWorkplacesArray !== undefined) {
      await setRawWorkplaces(req.user.id, newWorkplacesArray);
    }

    // Re-fetch fresh data to return accurate response
    const [freshUser, savedWorkplaces] = await Promise.all([
      prisma.user.findUnique({ where: { id: req.user.id }, select: PROFILE_SELECT }),
      getRawWorkplaces(req.user.id),
    ]);
    const resolvedWorkplaces = savedWorkplaces.length > 0 ? savedWorkplaces
      : (freshUser.workplace_name ? [{ name: freshUser.workplace_name, place_id: freshUser.workplace_place_id || null, address: freshUser.workplace_address || null }] : []);

    res.json({ user: formatUser(freshUser, resolvedWorkplaces) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

module.exports = router;
