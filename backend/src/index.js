require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
// socket.io temporarily disabled — using polling fallback
// const http = require('http');
// const { Server } = require('socket.io');

const authRoutes = require('./routes/auth');
const googleAuthRoutes = require('./routes/google-auth');
const postRoutes = require('./routes/posts');
const commentRoutes = require('./routes/comments');
const employerRoutes = require('./routes/employers');
const locationRoutes = require('./routes/locations');
const subscriptionRoutes = require('./routes/subscriptions');
const notificationRoutes = require('./routes/notifications');
const ratingRoutes = require('./routes/ratings');
const followRoutes = require('./routes/follows');
const searchRoutes = require('./routes/search');
const messageRoutes = require('./routes/messages');
const userRoutes = require('./routes/users');
const pollRoutes = require('./routes/polls');
const dailyPromptsRoutes = require('./routes/dailyPrompts');

const app = express();
const PORT = process.env.PORT || 3001;

// Trust Railway's proxy so rate limiter can read real IPs
app.set('trust proxy', 1);

// Gzip compression — reduces response size ~70% for JSON/text
app.use(compression());

// Security middleware
app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    const allowed = [
      'http://localhost:5173',
      'http://localhost:3000',
      process.env.FRONTEND_URL,
    ].filter(Boolean);
    if (!origin || allowed.includes(origin) || origin.endsWith('.up.railway.app') || origin.endsWith('.railway.app')) {
      callback(null, true);
    } else {
      callback(null, true); // allow all for now, restrict after domain is set
    }
  },
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000, // 1000 requests per 15 min — plenty for normal app usage
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for auth endpoints entirely
    return req.path.startsWith('/auth/');
  },
});
app.use('/api/', limiter);

const postLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: { error: 'Too many posts. Please wait before posting again.' },
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health check — also used as keep-alive ping (no DB hit needed)
app.get('/health', (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: 'v5-polls' });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/auth', googleAuthRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/posts/:postId/comments', commentRoutes);
app.use('/api/employers', employerRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/ratings', ratingRoutes);
app.use('/api/follows', followRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/users', userRoutes);
app.use('/api/polls', pollRoutes);
app.use('/api/daily-prompts', dailyPromptsRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
});

app.listen(PORT, () => {
  console.log(`Clocked API running on port ${PORT}`);
  // Non-blocking backfill: geocode posts missing employer coords
  setTimeout(() => {
    const prisma = require('./lib/prisma');
    const https = require('https');
    const GMAPS_KEY = process.env.GOOGLE_MAPS_API_KEY || 'AIzaSyDVTt1iv8oqd9ziIMyqs_jCo6et5iucc2s';
    function geocodeAddr(address) {
      return new Promise(resolve => {
        const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${GMAPS_KEY}`;
        https.get(url, res => {
          let d = ''; res.on('data', c => d += c);
          res.on('end', () => {
            try { const j = JSON.parse(d); const loc = j.results?.[0]?.geometry?.location; resolve(loc ? { lat: loc.lat, lng: loc.lng } : null); } catch { resolve(null); }
          });
        }).on('error', () => resolve(null));
      });
    }
    prisma.post.findMany({ where: { employer_address: { not: null }, employer_lat: null }, select: { id: true, employer_address: true } })
      .then(async posts => {
        if (!posts.length) return;
        console.log(`[backfill] geocoding ${posts.length} posts...`);
        for (const post of posts) {
          const coords = await geocodeAddr(post.employer_address);
          if (coords) await prisma.post.update({ where: { id: post.id }, data: { employer_lat: coords.lat, employer_lng: coords.lng } }).catch(() => {});
          await new Promise(r => setTimeout(r, 120));
        }
        console.log('[backfill] done');
      }).catch(() => {});
  }, 3000);
});

module.exports = app;
// 1774988759
// force redeploy Thu Apr  2 18:34:35 EDT 2026
