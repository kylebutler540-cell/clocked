const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const prisma = require('../lib/prisma');
const { requireAuth } = require('../middleware/auth');
const { generateUniqueAnonNumber } = require('../lib/anonNumber');

const router = express.Router();

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
    res.status(201).json({
      token,
      user: { id: user.id, email: user.email, anonymous_id: user.anonymous_id, subscription_status: user.subscription_status, anon_number: user.anon_number },
    });
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
    if (!user || !user.password_hash) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = signToken(user.id);
    res.json({
      token,
      user: { id: user.id, email: user.email, anonymous_id: user.anonymous_id, subscription_status: user.subscription_status, anon_number: user.anon_number },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get public user info by userId (anon number only, no email)
router.get('/user/:userId', async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.userId },
      select: { anon_number: true },
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ anon_number: user.anon_number });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Get current user
router.get('/me', requireAuth, async (req, res) => {
  res.json({
    user: {
      id: req.user.id,
      email: req.user.email,
      anonymous_id: req.user.anonymous_id,
      subscription_status: req.user.subscription_status,
      anon_number: req.user.anon_number,
      created_at: req.user.created_at,
    },
  });
});

module.exports = router;
