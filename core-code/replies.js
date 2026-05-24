const express = require('express');
const { db } = require('./database');

const router = express.Router({ mergeParams: true });

function randomId() {
  return require('crypto').randomUUID ? require('crypto').randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function getProfile(code) {
  return db.prepare('SELECT * FROM profiles WHERE anonymous_code = ?').get(code);
}

function createProfile(code) {
  const id = randomId();
  db.prepare('INSERT INTO profiles (id, anonymous_code) VALUES (?, ?)').run(id, code);
  return { id, anonymous_code: code };
}

// GET /api/replies/:noteId
router.get('/:noteId', (req, res) => {
  const { noteId } = req.params;
  const all = db.prepare(`
    SELECT r.*, p.anonymous_code as author_code, p.nickname as author_nickname
    FROM replies r
    LEFT JOIN profiles p ON r.author_id = p.id
    WHERE r.note_id = ?
    ORDER BY r.created_at
  `).all(noteId);

  const top = all.filter(r => !r.parent_id);
  const tree = top.map(r => ({
    id: r.id,
    content: r.content,
    createdAt: r.created_at,
    author: { anonymous_code: r.author_code || '匿名', nickname: r.author_nickname },
    children: all.filter(c => c.parent_id === r.id).map(c => ({
      id: c.id,
      content: c.content,
      createdAt: c.created_at,
      author: { anonymous_code: c.author_code || '匿名', nickname: c.author_nickname },
      children: [],
    })),
  }));

  res.json({ replies: tree });
});

// POST /api/replies/:noteId
router.post('/:noteId', (req, res) => {
  const { noteId } = req.params;
  const { content, parentId, authorCode } = req.body;
  if (!content || content.length > 300) return res.status(400).json({ error: 'Content required, max 300 chars' });

  // Validate parent nesting depth
  if (parentId) {
    const parent = db.prepare('SELECT * FROM replies WHERE id = ?').get(parentId);
    if (!parent) return res.status(400).json({ error: 'Parent reply not found' });
    if (parent.parent_id) return res.status(400).json({ error: 'Max nesting depth is 2' });
  }

  let profile = null;
  if (authorCode) {
    profile = getProfile(authorCode);
    if (!profile) profile = createProfile(authorCode);
  }

  const id = randomId();
  db.prepare('INSERT INTO replies (id, note_id, parent_id, author_id, content) VALUES (?, ?, ?, ?, ?)')
    .run(id, noteId, parentId || null, profile ? profile.id : null, content);

  db.prepare('UPDATE notes SET reply_count = reply_count + 1 WHERE id = ?').run(noteId);

  const newReply = db.prepare('SELECT r.*, p.anonymous_code as author_code, p.nickname as author_nickname FROM replies r LEFT JOIN profiles p ON r.author_id = p.id WHERE r.id = ?').get(id);

  res.status(201).json({
    id: newReply.id,
    content: newReply.content,
    createdAt: newReply.created_at,
    author: { anonymous_code: newReply.author_code || '匿名', nickname: newReply.author_nickname },
    children: [],
  });
});

module.exports = router;
