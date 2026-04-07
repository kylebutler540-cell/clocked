require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

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

const app = express();
const PORT = process.env.PORT || 3001;

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
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

const postLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: { error: 'Too many posts. Please wait before posting again.' },
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health check
app.get('/health', (req, res) => {
  const employerRoutes = require('./routes/employers');
  const logoRoute = employerRoutes.stack?.filter(r => r.route).map(r => r.route.path) || [];
  res.json({ status: 'ok', timestamp: new Date().toISOString(), employerRoutes: logoRoute });
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
});

module.exports = app;
// 1774988759
// force redeploy Thu Apr  2 18:34:35 EDT 2026
