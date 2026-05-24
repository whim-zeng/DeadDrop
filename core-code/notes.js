const express = require('express');
const { db, haversine } = require('./database');
const { v4: uuidv4 } = require('crypto');

const router = express.Router();

function randomId() {
  return uuidv4 ? require('crypto').randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function getProfile(code) {
  return db.prepare('SELECT * FROM profiles WHERE anonymous_code = ?').get(code);
}

function createProfile(code) {
  const id = randomId();
  db.prepare('INSERT INTO profiles (id, anonymous_code) VALUES (?, ?)').run(id, code);
  return { id, anonymous_code: code, nickname: null, avatar_gradient: 'blue' };
}

// GET /api/notes/nearby
router.post('/nearby', (req, res) => {
  const { lat, lng, radius = 200 } = req.body;
  if (lat == null || lng == null) return res.status(400).json({ error: 'lat and lng required' });

  const allNotes = db.prepare(`
    SELECT n.*, p.anonymous_code as author_code, p.nickname as author_nickname
    FROM notes n
    LEFT JOIN profiles p ON n.author_id = p.id
    WHERE n.archived_at IS NULL AND n.expires_at > datetime('now') AND n.moderation_status = 'approved'
  `).all();

  const notesWithDist = allNotes.map(n => ({
    ...n,
    distance: haversine(lat, lng, n.lat, n.lng),
  })).sort((a, b) => a.distance - b.distance);

  const unlocked = [];
  const preview = [];
  const distant = [];

  notesWithDist.forEach(n => {
    if (n.distance <= 50) {
      unlocked.push({
        id: n.id,
        content: n.content,
        contentPreview: n.content.slice(0, 30),
        voiceDuration: n.voice_duration,
        distance: Math.round(n.distance),
        lat: n.lat,
        lng: n.lng,
        authorCode: n.author_code || '匿名',
        authorNickname: n.author_nickname,
        moodTag: n.mood_tag,
        topicTags: n.topic_tags ? n.topic_tags.split(',') : [],
        noteType: n.note_type,
        lifespanType: n.lifespan_type,
        expiresAt: n.expires_at,
        readCount: n.read_count,
        replyCount: n.reply_count,
        createdAt: n.created_at,
        isRead: false,
        isPinned: !!n.is_pinned,
        isAgentLocation: !!n.location_id,
      });
    } else if (n.distance <= 200) {
      preview.push({
        id: n.id,
        contentPreview: n.content.slice(0, 30),
        distance: Math.round(n.distance),
        lat: n.lat,
        lng: n.lng,
        noteType: n.note_type,
        moodTag: n.mood_tag,
        readCount: n.read_count,
      });
    }
  });

  // Aggregate distant notes into clusters
  const distantNotes = notesWithDist.filter(n => n.distance > 200);
  if (distantNotes.length > 0) {
    // Simple grid aggregation
    const gridSize = 0.003; // ~300m
    const gridMap = new Map();
    distantNotes.forEach(n => {
      const gLat = Math.round(n.lat / gridSize) * gridSize;
      const gLng = Math.round(n.lng / gridSize) * gridSize;
      const key = `${gLat.toFixed(4)},${gLng.toFixed(4)}`;
      if (!gridMap.has(key)) {
        gridMap.set(key, { lat: gLat, lng: gLng, count: 0, notes: [] });
      }
      const g = gridMap.get(key);
      g.count++;
      g.notes.push(n);
    });
    gridMap.forEach(g => {
      const centerDist = Math.round(haversine(lat, lng, g.lat, g.lng));
      distant.push({ lat: g.lat, lng: g.lng, count: g.count, centerDistance: centerDist });
    });
  }

  res.json({
    unlocked,
    preview,
    distant,
    summary: {
      total: unlocked.length + preview.length + distantNotes.length,
      unlockedCount: unlocked.length,
      previewCount: preview.length,
      distantCount: distantNotes.length,
    },
    locationId: null,
  });
});

function mapNoteRow(n) {
  return {
    id: n.id,
    content: n.content,
    contentPreview: n.content.slice(0, 30),
    lat: n.lat,
    lng: n.lng,
    moodTag: n.mood_tag,
    topicTags: n.topic_tags ? n.topic_tags.split(',') : [],
    lifespanType: n.lifespan_type,
    expiresAt: n.expires_at,
    readCount: n.read_count,
    replyCount: n.reply_count,
    createdAt: n.created_at,
    authorCode: n.author_code || '匿名',
    authorNickname: n.author_nickname,
  };
}

router.post('/profile-stats', (req, res) => {
  const { authorCode } = req.body;
  if (!authorCode) return res.status(400).json({ error: 'authorCode required' });

  let profile = getProfile(authorCode);
  if (!profile) profile = createProfile(authorCode);

  const notesCount = db.prepare(`
    SELECT COUNT(*) as c FROM notes
    WHERE author_id = ? AND archived_at IS NULL AND expires_at > datetime('now')
  `).get(profile.id).c;

  const readCount = db.prepare('SELECT COUNT(*) as c FROM note_reads WHERE reader_id = ?').get(profile.id).c;
  const replyCount = db.prepare('SELECT COUNT(*) as c FROM replies WHERE author_id = ?').get(profile.id).c;
  const receivedReplies = db.prepare(`
    SELECT COUNT(*) as c FROM replies r
    JOIN notes n ON n.id = r.note_id
    WHERE n.author_id = ?
  `).get(profile.id).c;

  res.json({
    notesCount,
    readCount,
    replyCount,
    receivedReplies,
    anonymousCode: profile.anonymous_code,
    nickname: profile.nickname,
  });
});

router.post('/mine', (req, res) => {
  const { authorCode } = req.body;
  if (!authorCode) return res.status(400).json({ error: 'authorCode required' });

  const profile = getProfile(authorCode);
  if (!profile) return res.json({ notes: [] });

  const notes = db.prepare(`
    SELECT n.*, p.anonymous_code as author_code, p.nickname as author_nickname
    FROM notes n
    LEFT JOIN profiles p ON n.author_id = p.id
    WHERE n.author_id = ? AND n.archived_at IS NULL
    ORDER BY n.created_at DESC
    LIMIT 50
  `).all(profile.id).map(mapNoteRow);

  res.json({ notes });
});

router.post('/read-history', (req, res) => {
  const { authorCode } = req.body;
  if (!authorCode) return res.status(400).json({ error: 'authorCode required' });

  const profile = getProfile(authorCode);
  if (!profile) return res.json({ reads: [] });

  const reads = db.prepare(`
    SELECT nr.read_at, n.id, n.content, n.mood_tag, n.lat, n.lng,
           p.anonymous_code as author_code, p.nickname as author_nickname
    FROM note_reads nr
    JOIN notes n ON n.id = nr.note_id
    LEFT JOIN profiles p ON p.id = n.author_id
    WHERE nr.reader_id = ?
    ORDER BY nr.read_at DESC
    LIMIT 50
  `).all(profile.id).map(r => ({
    noteId: r.id,
    contentPreview: r.content.slice(0, 40),
    moodTag: r.mood_tag,
    authorCode: r.author_code || '匿名',
    authorNickname: r.author_nickname,
    readAt: r.read_at,
  }));

  res.json({ reads });
});

// POST /api/notes/:id/read
router.post('/:id/read', (req, res) => {
  const { id } = req.params;
  const { readerLat, readerLng, readerAccuracy = 10, readerCode } = req.body;

  const note = db.prepare('SELECT n.*, p.anonymous_code as author_code, p.nickname as author_nickname FROM notes n LEFT JOIN profiles p ON n.author_id = p.id WHERE n.id = ?').get(id);
  if (!note) return res.status(404).json({ error: 'Note not found' });

  const distance = haversine(readerLat, readerLng, note.lat, note.lng);
  const threshold = readerAccuracy > 50 ? 100 : readerAccuracy > 20 ? 70 : 50;

  if (distance > threshold) {
    return res.status(403).json({
      unlocked: false,
      distance: Math.round(distance),
      requiredDistance: threshold,
      message: `距离太远：还需走近 ${Math.round(distance - threshold)} 米`,
    });
  }

  // Record read (if readerCode provided)
  let isFirstRead = true;
  if (readerCode) {
    let profile = getProfile(readerCode);
    if (!profile) profile = createProfile(readerCode);
    const existing = db.prepare('SELECT 1 FROM note_reads WHERE note_id = ? AND reader_id = ?').get(id, profile.id);
    if (!existing) {
      db.prepare('INSERT INTO note_reads (id, note_id, reader_id, reader_lat, reader_lng, distance_calculated) VALUES (?, ?, ?, ?, ?, ?)')
        .run(randomId(), id, profile.id, readerLat, readerLng, Math.round(distance));
      db.prepare('UPDATE notes SET read_count = read_count + 1 WHERE id = ?').run(id);
      note.read_count++;
    } else {
      isFirstRead = false;
    }
  }

  // Get replies (nested)
  const allReplies = db.prepare(`
    SELECT r.*, p.anonymous_code as author_code, p.nickname as author_nickname
    FROM replies r
    LEFT JOIN profiles p ON r.author_id = p.id
    WHERE r.note_id = ?
    ORDER BY r.created_at
  `).all(id);

  const topReplies = allReplies.filter(r => !r.parent_id);
  const replyTree = topReplies.map(r => ({
    id: r.id,
    content: r.content,
    createdAt: r.created_at,
    author: { anonymous_code: r.author_code || '匿名', nickname: r.author_nickname },
    children: allReplies.filter(c => c.parent_id === r.id).map(c => ({
      id: c.id,
      content: c.content,
      createdAt: c.created_at,
      author: { anonymous_code: c.author_code || '匿名', nickname: c.author_nickname },
      children: [],
    })),
  }));

  res.json({
    note: {
      id: note.id,
      content: note.content,
      voiceUrl: note.voice_url,
      voiceDuration: note.voice_duration,
      authorCode: note.author_code || '匿名',
      authorNickname: note.author_nickname,
      moodTag: note.mood_tag,
      topicTags: note.topic_tags ? note.topic_tags.split(',') : [],
      createdAt: note.created_at,
      readCount: note.read_count,
      replyCount: note.reply_count,
      lifespanType: note.lifespan_type,
      expiresAt: note.expires_at,
      distance: Math.round(distance),
    },
    replies: replyTree,
    isFirstRead,
    distance: Math.round(distance),
    unlocked: true,
  });
});

// POST /api/notes
router.post('/', (req, res) => {
  const { content, lat, lng, lifespanType = '24h', moodTag, topicTags = [], authorCode } = req.body;
  if (!content || content.length > 500) return res.status(400).json({ error: 'Content required, max 500 chars' });

  let profile = null;
  if (authorCode) {
    profile = getProfile(authorCode);
    if (!profile) profile = createProfile(authorCode);
  }

  const now = new Date();
  let expiresAt;
  if (lifespanType === '24h') expiresAt = new Date(now.getTime() + 24 * 3600 * 1000);
  else if (lifespanType === '7d') expiresAt = new Date(now.getTime() + 7 * 86400 * 1000);
  else expiresAt = new Date('2099-12-31');

  const id = randomId();
  db.prepare(`
    INSERT INTO notes (id, author_id, content, lat, lng, lifespan_type, mood_tag, topic_tags, expires_at, moderation_status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, profile ? profile.id : null, content, lat, lng, lifespanType, moodTag || 'thought', topicTags.join(','), expiresAt.toISOString(), 'approved');

  const newNote = db.prepare('SELECT n.*, p.anonymous_code as author_code FROM notes n LEFT JOIN profiles p ON n.author_id = p.id WHERE n.id = ?').get(id);

  res.status(201).json({
    id: newNote.id,
    content: newNote.content,
    contentPreview: newNote.content.slice(0, 30),
    lat: newNote.lat,
    lng: newNote.lng,
    authorCode: newNote.author_code || '匿名',
    moodTag: newNote.mood_tag,
    topicTags: newNote.topic_tags ? newNote.topic_tags.split(',') : [],
    lifespanType: newNote.lifespan_type,
    expiresAt: newNote.expires_at,
    readCount: 0,
    replyCount: 0,
    distance: 0,
  });
});

module.exports = router;
