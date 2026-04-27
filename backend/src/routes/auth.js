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
};

const ADMIN_EMAILS = ['kylebutler540@gmail.com', 'clockedreports@gmail.com'];

function formatUser(user) {
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
      },
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Get current user
router.get('/me', requireAuth, async (req, res) => {
  res.json({ user: formatUser(req.user) });
});

// Update profile (display_name, username, avatar_url, bio, workplace)
router.patch('/profile', requireAuth, async (req, res) => {
  try {
    const { display_name, username, avatar_url, bio, workplace_name, workplace_place_id, workplace_address } = req.body;
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

    if (workplace_name !== undefined) {
      updateData.workplace_name = workplace_name || null;
      updateData.workplace_place_id = workplace_place_id || null;
      updateData.workplace_address = workplace_address || null;
    }

    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: updateData,
    });

    res.json({ user: formatUser(updated) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

module.exports = router;
