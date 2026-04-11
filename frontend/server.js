import express from 'express';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;
const DIST = join(__dirname, 'dist');

// index.html: always no-cache
app.get('/', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.sendFile(join(DIST, 'index.html'));
});

// Hashed assets: immutable cache
app.use('/assets', express.static(join(DIST, 'assets'), {
  maxAge: '1y',
  immutable: true,
}));

// Other static files
app.use(express.static(DIST, { maxAge: 0, etag: false }));

// SPA fallback
app.get(/.*/, (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.sendFile(join(DIST, 'index.html'));
});

app.listen(PORT, () => console.log(`Frontend on port ${PORT}`));
