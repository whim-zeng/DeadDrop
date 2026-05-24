const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

function buildSketchTileSvg(z, x, y) {
  const tone = ((Number(x) + Number(y) + Number(z)) % 4 + 4) % 4;
  const bg = ['#f7f5ef', '#f4efe6', '#f8f7f2', '#f3f1ea'][tone];
  const road = ['#e2d8c7', '#ddcfc0', '#e5dccb', '#d8cfbf'][tone];
  const accent = ['#c9c1b0', '#c4b79f', '#d1c8b8', '#c7bda9'][tone];
  const label = `${z}/${x}/${y}`;
  return `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">` +
    `<rect width="256" height="256" fill="${bg}"/>` +
    `<g opacity="0.95" stroke-linecap="round" fill="none">` +
    `<path d="M-10 54 H266" stroke="${road}" stroke-width="10"/>` +
    `<path d="M-10 122 H266" stroke="${road}" stroke-width="7"/>` +
    `<path d="M-10 198 H266" stroke="${road}" stroke-width="8"/>` +
    `<path d="M48 -10 V266" stroke="${road}" stroke-width="7"/>` +
    `<path d="M128 -10 V266" stroke="${road}" stroke-width="10"/>` +
    `<path d="M204 -10 V266" stroke="${road}" stroke-width="6"/>` +
    `<path d="M0 32 C40 42, 58 68, 104 72 S194 66, 256 90" stroke="${accent}" stroke-width="3"/>` +
    `<path d="M0 164 C50 150, 86 140, 130 152 S210 188, 256 176" stroke="${accent}" stroke-width="3"/>` +
    `</g>` +
    `<rect x="8" y="8" rx="6" ry="6" width="84" height="22" fill="rgba(250,249,245,0.88)" stroke="rgba(210,201,185,0.8)"/>` +
    `<text x="16" y="23" font-size="11" font-family="Arial, sans-serif" fill="#8f8a7e">DeadDrop Map</text>` +
    `<text x="128" y="135" text-anchor="middle" font-size="14" font-family="Arial, sans-serif" fill="#a59e8f" opacity="0.9">${label}</text>` +
    `</svg>`;
}

async function fetchOsmTile(z, x, y) {
  const tileUrl = `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 2500);
  try {
    const upstream = await fetch(tileUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'DeadDrop/1.0',
        'Accept': 'image/png,image/*;q=0.9,*/*;q=0.8',
      },
    });
    if (upstream.ok) {
      return { type: 'png', body: Buffer.from(await upstream.arrayBuffer()) };
    }
  } catch (_) {
    // fall through to sketch SVG
  } finally {
    clearTimeout(timer);
  }
  return { type: 'svg', body: buildSketchTileSvg(z, x, y) };
}

// Serve map tiles — direct fetch with fast SVG fallback (no proxy dependency)
app.get('/tiles/osm/:z/:x/:y.png', async (req, res, next) => {
  try {
    const { z, x, y } = req.params;
    const tile = await fetchOsmTile(z, x, y);
    if (tile.type === 'png') {
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Cache-Control', 'public, max-age=86400');
    } else {
      res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=3600');
    }
    res.send(tile.body);
  } catch (error) {
    next(error);
  }
});

// API Routes
const notesRouter = require('./notes');
const repliesRouter = require('./replies');
const heatmapRouter = require('./heatmap');

// Map to frontend-expected paths
app.post('/functions/v1/notes-nearby', (req, res, next) => {
  req.url = '/nearby';
  notesRouter.handle(req, res, next);
});

app.post('/functions/v1/notes-read/:id', (req, res, next) => {
  req.url = `/${req.params.id}/read`;
  notesRouter.handle(req, res, next);
});

app.post('/functions/v1/notes-create', (req, res, next) => {
  req.url = '/';
  notesRouter.handle(req, res, next);
});

app.post('/functions/v1/profile-stats', (req, res, next) => {
  req.url = '/profile-stats';
  notesRouter.handle(req, res, next);
});

app.post('/functions/v1/notes-mine', (req, res, next) => {
  req.url = '/mine';
  notesRouter.handle(req, res, next);
});

app.post('/functions/v1/read-history', (req, res, next) => {
  req.url = '/read-history';
  notesRouter.handle(req, res, next);
});

app.use('/functions/v1/replies', repliesRouter);
app.use('/functions/v1/notes-heatmap', heatmapRouter);

// Also support /api/* paths for direct access
app.use('/api/notes', notesRouter);
app.use('/api/replies', repliesRouter);
app.use('/api/heatmap', heatmapRouter);

// Proxy geocode requests to Gaode (avoids CORS and key platform mismatch)
app.get('/api/geocode', async (req, res, next) => {
  try {
    const { lat, lng } = req.query;
    if (!lat || !lng) {
      return res.status(400).json({ error: 'lat and lng required' });
    }
    const GAODE_KEY = '50114c7490bc96da3fc8557de95fe0de';
    const url = `https://restapi.amap.com/v3/geocode/regeo?key=${GAODE_KEY}&location=${lng},${lat}&extensions=base`;
    const upstream = await fetch(url, {
      signal: AbortSignal.timeout(5000),
      headers: { 'Accept': 'application/json' },
    });
    const data = await upstream.json();
    res.json(data);
  } catch (error) {
    next(error);
  }
});

// Static files
app.use(express.static(__dirname));

// Fallback to index.html for SPA
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Error handler
const { errorHandler } = require('./error');
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`DeadDrop server running on http://127.0.0.1:${PORT}`);
});
