const express = require('express');
const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const prisma = require('../lib/prisma');
const { generateUniqueAnonNumber } = require('../lib/anonNumber');

const router = express.Router();
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

function signToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '90d' });
}

// Google Sign-In via ID token (from frontend Google Sign-In button)
router.post('/google', async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) return res.status(400).json({ error: 'Google credential required' });

    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { email, name, picture, sub: googleId } = payload;

    // Detect anonymous session to merge (posted before signing in)
    let anonUser = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const anonToken = authHeader.slice(7);
        const anonPayload = jwt.verify(anonToken, process.env.JWT_SECRET);
        const candidate = await prisma.user.findUnique({ where: { id: anonPayload.userId } });
        if (candidate && !candidate.email) {
          anonUser = candidate;
        }
      } catch { /* ignore invalid/expired token */ }
    }

    // Find or create Google user
    let user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      const anonNum = await generateUniqueAnonNumber();
      user = await prisma.user.create({
        data: {
          email,
          anonymous_id: uuidv4(),
          google_id: googleId,
          anon_number: anonNum,
        },
      });
    } else if (!user.google_id) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { google_id: googleId },
      });
    }

    // Merge anonymous user's posts and comments into the Google account
    if (anonUser && anonUser.id !== user.id) {
      try {
        await prisma.$transaction([
          prisma.post.updateMany({
            where: { anonymous_user_id: anonUser.id },
            data: { anonymous_user_id: user.id },
          }),
          prisma.comment.updateMany({
            where: { anonymous_user_id: anonUser.id },
            data: { anonymous_user_id: user.id },
          }),
          prisma.save.deleteMany({ where: { user_id: anonUser.id } }),
          prisma.postReaction.deleteMany({ where: { user_id: anonUser.id } }),
          prisma.flag.deleteMany({ where: { user_id: anonUser.id } }),
          prisma.notification.deleteMany({ where: { user_id: anonUser.id } }),
          prisma.user.delete({ where: { id: anonUser.id } }),
        ]);
      } catch (mergeErr) {
        console.error('Account merge failed (non-fatal):', mergeErr);
      }
    }

    const ADMIN_EMAILS = ['kylebutler540@gmail.com', 'clockedreports@gmail.com'];
    const token = signToken(user.id);
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        is_admin: ADMIN_EMAILS.includes(user.email),
        anonymous_id: user.anonymous_id,
        subscription_status: user.subscription_status,
        anon_number: user.anon_number,
        display_name: user.display_name,
        username: user.username,
        avatar_url: user.avatar_url,
        follower_count: user.follower_count,
        following_count: user.following_count,
      },
    });
  } catch (err) {
    console.error('Google auth error:', err);
    res.status(401).json({ error: 'Invalid Google credential' });
  }
});

module.exports = router;
