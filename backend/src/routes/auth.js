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
  workplaces: true,
};

// Parse workplaces stored as JSON strings in the String[] column
function parseWorkplaces(raw) {
  if (!Array.isArray(raw) || raw.length === 0) return [];
  return raw.map(w => {
    try { return typeof w === 'string' ? JSON.parse(w) : w; }
    catch { return null; }
  }).filter(Boolean);
}

// Serialize workplace objects into JSON strings for storage
function serializeWorkplaces(workplacesArray) {
  return workplacesArray.slice(0, 3).map(w => JSON.stringify({
    name: w.name || '',
    place_id: w.place_id || null,
    address: w.address || null,
  }));
}

const ADMIN_EMAILS = ['kylebutler540@gmail.com', 'clockedreports@gmail.com'];

function formatUser(user, workplacesOverride) {
  let workplaces = [];
  if (workplacesOverride !== undefined) {
    workplaces = workplacesOverride;
  } else if (user.workplaces && user.workplaces.length > 0) {
    workplaces = parseWorkplaces(user.workplaces);
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
    const user = await prisma.user.findUnique({
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
        workplaces: true,
      },
    });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const workplaces = user.workplaces && user.workplaces.length > 0
      ? parseWorkplaces(user.workplaces)
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
    const [user, postCount] = await Promise.all([
      prisma.user.findUnique({ where: { id: req.user.id }, select: PROFILE_SELECT }),
      prisma.post.count({ where: { anonymous_user_id: req.user.id } }),
    ]);
    res.json({ user: { ...formatUser(user), post_count: postCount } });
  } catch (err) {
    console.error('/me error:', err);
    res.json({ user: { ...formatUser(req.user), post_count: 0 } });
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

    // Determine new workplaces array
    let newWorkplacesArray = null; // null = not being updated
    if (workplaces !== undefined) {
      newWorkplacesArray = Array.isArray(workplaces) ? workplaces.slice(0, 3) : [];
      updateData.workplace_name = newWorkplacesArray.length > 0 ? (newWorkplacesArray[0].name || null) : null;
      updateData.workplace_place_id = newWorkplacesArray.length > 0 ? (newWorkplacesArray[0].place_id || null) : null;
      updateData.workplace_address = newWorkplacesArray.length > 0 ? (newWorkplacesArray[0].address || null) : null;
    } else if (workplace_name !== undefined) {
      updateData.workplace_name = workplace_name || null;
      updateData.workplace_place_id = workplace_place_id || null;
      updateData.workplace_address = workplace_address || null;
      newWorkplacesArray = workplace_name
        ? [{ name: workplace_name, place_id: workplace_place_id || null, address: workplace_address || null }]
        : [];
    }

    console.log('[PATCH /profile] updateData:', JSON.stringify(updateData));
    console.log('[PATCH /profile] newWorkplacesArray:', JSON.stringify(newWorkplacesArray));

    // Update non-workplace fields via Prisma
    await prisma.user.update({ where: { id: req.user.id }, data: updateData });

    // Write workplaces column via raw SQL with explicit per-item parameters
    // This avoids all Prisma scalar list / pg driver array serialization issues
    if (newWorkplacesArray !== null) {
      const jsonStrings = newWorkplacesArray.map(w => JSON.stringify({
        name: w.name || '',
        place_id: w.place_id || null,
        address: w.address || null,
      }));
      console.log('[PATCH /profile] writing workplaces to DB:', JSON.stringify(jsonStrings));
      if (jsonStrings.length === 0) {
        await prisma.$executeRawUnsafe(`UPDATE users SET workplaces = ARRAY[]::TEXT[] WHERE id = $1`, req.user.id);
      } else if (jsonStrings.length === 1) {
        await prisma.$executeRawUnsafe(`UPDATE users SET workplaces = ARRAY[$2::TEXT] WHERE id = $1`, req.user.id, jsonStrings[0]);
      } else if (jsonStrings.length === 2) {
        await prisma.$executeRawUnsafe(`UPDATE users SET workplaces = ARRAY[$2::TEXT,$3::TEXT] WHERE id = $1`, req.user.id, jsonStrings[0], jsonStrings[1]);
      } else {
        await prisma.$executeRawUnsafe(`UPDATE users SET workplaces = ARRAY[$2::TEXT,$3::TEXT,$4::TEXT] WHERE id = $1`, req.user.id, jsonStrings[0], jsonStrings[1], jsonStrings[2]);
      }
    }

    // Re-fetch and return
    const freshUser = await prisma.user.findUnique({ where: { id: req.user.id }, select: PROFILE_SELECT });
    console.log('[PATCH /profile] freshUser.workplaces:', JSON.stringify(freshUser.workplaces), 'workplace_name:', freshUser.workplace_name);
    res.json({ user: formatUser(freshUser) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

module.exports = router;
