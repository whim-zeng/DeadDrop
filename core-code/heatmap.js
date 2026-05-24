const express = require('express');
const { db, haversine } = require('./database');

const router = express.Router();

router.post('/', (req, res) => {
  const { north, south, east, west, zoom = 14 } = req.body;

  const gridSize = zoom >= 15 ? 0.001 : zoom >= 12 ? 0.005 : 0.01;

  const notes = db.prepare(`
    SELECT lat, lng, read_count, reply_count, mood_tag
    FROM notes
    WHERE archived_at IS NULL AND expires_at > datetime('now') AND moderation_status = 'approved'
      AND lat BETWEEN ? AND ? AND lng BETWEEN ? AND ?
  `).all(south, north, west, east);

  const gridMap = new Map();
  notes.forEach(n => {
    const gLat = Math.round(n.lat / gridSize) * gridSize;
    const gLng = Math.round(n.lng / gridSize) * gridSize;
    const key = `${gLat.toFixed(5)},${gLng.toFixed(5)}`;
    if (!gridMap.has(key)) {
      gridMap.set(key, { grid_lat: gLat, grid_lng: gLng, note_count: 0, total_reads: 0, moods: {} });
    }
    const g = gridMap.get(key);
    g.note_count++;
    g.total_reads += n.read_count;
    g.moods[n.mood_tag || 'unknown'] = (g.moods[n.mood_tag || 'unknown'] || 0) + 1;
  });

  const grids = Array.from(gridMap.values()).map(g => {
    const dominantMood = Object.entries(g.moods).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
    return {
      grid_lat: g.grid_lat,
      grid_lng: g.grid_lng,
      note_count: g.note_count,
      total_reads: g.total_reads,
      avg_mood: dominantMood,
    };
  });

  res.json({ grids, total_grids: grids.length, grid_size: gridSize });
});

module.exports = router;
