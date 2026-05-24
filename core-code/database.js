const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'deddrop.db');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ===== Haversine distance (meters) =====
function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ===== Migrations =====
function migrate() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS locations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      radius_meters INTEGER DEFAULT 50,
      location_type TEXT DEFAULT 'generic',
      agent_config TEXT,
      note_count INTEGER DEFAULT 0,
      hot_score REAL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS profiles (
      id TEXT PRIMARY KEY,
      fingerprint_hash TEXT UNIQUE,
      anonymous_code TEXT UNIQUE NOT NULL,
      nickname TEXT,
      avatar_gradient TEXT DEFAULT 'blue',
      created_at TEXT DEFAULT (datetime('now')),
      last_seen_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      author_id TEXT REFERENCES profiles(id) ON DELETE SET NULL,
      content TEXT NOT NULL CHECK(length(content) <= 500),
      voice_url TEXT,
      voice_duration INTEGER,
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      note_type TEXT DEFAULT 'text' CHECK(note_type IN ('text', 'voice')),
      mood_tag TEXT CHECK(mood_tag IN ('happy', 'sad', 'angry', 'anxious', 'love', 'thought', 'rant')),
      topic_tags TEXT,
      lifespan_type TEXT NOT NULL CHECK(lifespan_type IN ('24h', '7d', 'permanent')),
      created_at TEXT DEFAULT (datetime('now')),
      expires_at TEXT NOT NULL,
      read_count INTEGER DEFAULT 0,
      reply_count INTEGER DEFAULT 0,
      is_pinned INTEGER DEFAULT 0,
      is_flagged INTEGER DEFAULT 0,
      moderation_status TEXT DEFAULT 'approved' CHECK(moderation_status IN ('pending', 'approved', 'rejected')),
      location_id TEXT REFERENCES locations(id),
      archived_at TEXT
    );

    CREATE TABLE IF NOT EXISTS replies (
      id TEXT PRIMARY KEY,
      note_id TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
      parent_id TEXT REFERENCES replies(id) ON DELETE CASCADE,
      author_id TEXT REFERENCES profiles(id) ON DELETE SET NULL,
      content TEXT NOT NULL CHECK(length(content) <= 300),
      voice_url TEXT,
      voice_duration INTEGER,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS note_reads (
      id TEXT PRIMARY KEY,
      note_id TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
      reader_id TEXT REFERENCES profiles(id) ON DELETE CASCADE,
      reader_lat REAL NOT NULL,
      reader_lng REAL NOT NULL,
      distance_calculated REAL,
      read_at TEXT DEFAULT (datetime('now')),
      UNIQUE(note_id, reader_id)
    );

    CREATE INDEX IF NOT EXISTS idx_notes_coords ON notes(lat, lng);
    CREATE INDEX IF NOT EXISTS idx_notes_expires ON notes(expires_at) WHERE archived_at IS NULL;
    CREATE INDEX IF NOT EXISTS idx_replies_note ON replies(note_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_note_reads_note ON note_reads(note_id);
  `);
}

// ===== Seed Data =====
function seed() {
  const count = db.prepare('SELECT COUNT(*) as c FROM notes').get();
  if (count.c > 0) return; // already seeded

  const now = new Date();
  const fmt = (d) => d.toISOString();

  // Locations
  const insertLoc = db.prepare('INSERT INTO locations (id, name, lat, lng, radius_meters, location_type, agent_config, hot_score, note_count) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
  insertLoc.run('loc-001', '静安寺地铁站', 31.2235, 121.446, 50, 'generic', null, 15, 3);
  insertLoc.run('loc-002', '外滩观景台', 31.2397, 121.4906, 80, 'scenic', '{"personality":"浪漫诗人","greeting":"在这里，每一阵风都带着故事"}', 42, 8);
  insertLoc.run('loc-003', '复旦大学食堂', 31.2975, 121.503, 50, 'campus', '{"personality":"学霸","greeting":"考试周加油！"}', 28, 5);

  // Profiles
  const insertProfile = db.prepare('INSERT INTO profiles (id, anonymous_code, nickname, avatar_gradient) VALUES (?, ?, ?, ?)');
  insertProfile.run('prof-001', '孤独的美食家_2847', null, 'blue');
  insertProfile.run('prof-002', '深夜的失眠者_9301', '夜猫子', 'pink');
  insertProfile.run('prof-003', '湖边的守望者_1562', null, 'purple');
  insertProfile.run('prof-004', '街角的咖啡师_4521', null, 'green');
  insertProfile.run('prof-005', '等待的归人_7812', null, 'orange');

  // Notes
  const insertNote = db.prepare(`
    INSERT INTO notes (id, author_id, content, lat, lng, note_type, mood_tag, topic_tags, lifespan_type, expires_at, read_count, reply_count, location_id, moderation_status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertNote.run('note-001', 'prof-001', '今天在这里等了一个小时，却还是没有勇气把信给她。也许下次吧。', 31.2237, 121.4462, 'text', 'sad', '失恋,暗恋', '24h', fmt(new Date(now.getTime() + 20 * 3600 * 1000)), 12, 3, 'loc-001', 'approved');
  insertNote.run('note-002', 'prof-002', '终于考上了复旦！三年努力没有白费，在这里纪念一下。', 31.2977, 121.5032, 'text', 'happy', '考试,梦想', 'permanent', '2099-12-31T00:00:00.000Z', 156, 24, 'loc-003', 'approved');
  insertNote.run('note-003', 'prof-003', '外滩的夜景还是这么美，只是身边的人换了。', 31.2399, 121.4908, 'text', 'love', '失恋', '7d', fmt(new Date(now.getTime() + 5 * 86400 * 1000)), 89, 12, 'loc-002', 'approved');
  insertNote.run('note-004', 'prof-004', '静安寺这家面馆的浇头真的很正宗，推荐给大家！', 31.2245, 121.4475, 'text', 'happy', '美食', '7d', fmt(new Date(now.getTime() + 6 * 86400 * 1000)), 45, 2, null, 'approved');
  insertNote.run('note-005', 'prof-005', '又被老板骂了，想辞职但不敢。三十岁的人还这么怂。', 31.2225, 121.4445, 'text', 'angry', '工作', '24h', fmt(new Date(now.getTime() + 18 * 3600 * 1000)), 67, 8, null, 'approved');
  insertNote.run('note-006', 'prof-001', '考研倒计时30天，每天来这里背书，希望能上岸。', 31.2985, 121.504, 'text', 'anxious', '考试', '24h', fmt(new Date(now.getTime() + 22 * 3600 * 1000)), 34, 5, null, 'approved');
  insertNote.run('note-007', 'prof-003', '散装的快乐', 31.220, 121.440, 'text', 'happy', '日常', '24h', fmt(new Date(now.getTime() + 12 * 3600 * 1000)), 5, 0, null, 'approved');
  insertNote.run('note-008', 'prof-004', '成年人的崩溃从早安开始', 31.215, 121.455, 'text', 'sad', '工作', '7d', fmt(new Date(now.getTime() + 4 * 86400 * 1000)), 23, 1, null, 'approved');
  insertNote.run('note-009', 'prof-002', '这个地方风水真好', 31.228, 121.465, 'text', 'thought', '日常', 'permanent', '2099-12-31T00:00:00.000Z', 8, 0, null, 'approved');
  insertNote.run('note-010', 'prof-005', '我想当一个不需要努力的废物', 31.235, 121.435, 'text', 'rant', '工作', '24h', fmt(new Date(now.getTime() + 8 * 3600 * 1000)), 45, 6, null, 'approved');
  insertNote.run('note-011', 'prof-001', '告白成功了！她说了好！', 31.245, 121.480, 'text', 'love', '告白', 'permanent', '2099-12-31T00:00:00.000Z', 230, 45, null, 'approved');

  // Replies
  const insertReply = db.prepare('INSERT INTO replies (id, note_id, parent_id, author_id, content, created_at) VALUES (?, ?, ?, ?, ?, ?)');
  insertReply.run('rep-001', 'note-001', null, 'prof-002', '加油，我去年也是在这里犹豫了一个月，最后成功了！', fmt(new Date(now.getTime() - 2 * 3600 * 1000)));
  insertReply.run('rep-002', 'note-001', 'rep-001', 'prof-001', '真的吗？你当时是怎么开口的？', fmt(new Date(now.getTime() - 1 * 3600 * 1000)));
  insertReply.run('rep-003', 'note-002', null, 'prof-003', '恭喜！复旦见！', fmt(new Date(now.getTime() - 5 * 3600 * 1000)));
  insertReply.run('rep-004', 'note-003', null, 'prof-004', '旧的不去新的不来，外滩永远都在。', fmt(new Date(now.getTime() - 3 * 3600 * 1000)));

  // Note reads
  const insertRead = db.prepare('INSERT INTO note_reads (id, note_id, reader_id, reader_lat, reader_lng, distance_calculated, read_at) VALUES (?, ?, ?, ?, ?, ?, ?)');
  insertRead.run('nr-001', 'note-001', 'prof-002', 31.2236, 121.4461, 12.5, fmt(new Date(now.getTime() - 6 * 3600 * 1000)));
  insertRead.run('nr-002', 'note-001', 'prof-003', 31.2238, 121.4463, 18.2, fmt(new Date(now.getTime() - 4 * 3600 * 1000)));
  insertRead.run('nr-003', 'note-001', 'prof-004', 31.2235, 121.4460, 8.7, fmt(new Date(now.getTime() - 2 * 3600 * 1000)));
  insertRead.run('nr-004', 'note-002', 'prof-001', 31.2976, 121.5031, 22.1, fmt(new Date(now.getTime() - 1 * 86400 * 1000)));
  insertRead.run('nr-005', 'note-003', 'prof-005', 31.2398, 121.4907, 15.3, fmt(new Date(now.getTime() - 8 * 3600 * 1000)));

  console.log('[DB] Seed data inserted.');
}

// Demo notes near default map center (31.2304, 121.4737) for路演展示
function cleanupJunkNotes() {
  db.prepare(`
    DELETE FROM notes
    WHERE content IN ('hi', 'test', '终于有demo了！', 'ddl来不及了', 'DDL来不及了')
       OR length(trim(content)) <= 4
       OR (id NOT LIKE 'note-%' AND id NOT LIKE 'demo-%')
  `).run();
}

function refreshDemoNotes() {
  const baseLat = 31.2304;
  const baseLng = 121.4737;
  const fmt = (d) => d.toISOString();
  const now = Date.now();

  db.prepare(`DELETE FROM notes WHERE id LIKE 'demo-%'`).run();

  const demoNotes = [
    {
      id: 'demo-001', author: 'prof-002', content: '淮海路的晚风很好，适合把说不出口的话留在这里。',
      lat: baseLat + 0.00005, lng: baseLng + 0.00004, mood: 'thought', tags: '城市,晚风', life: '7d', reads: 18, replies: 2, ageMin: 0,
    },
    {
      id: 'demo-002', author: 'prof-003', content: '离职最后一天，把这三年没说出口的感谢悄悄放在这里。',
      lat: baseLat - 0.00006, lng: baseLng + 0.00005, mood: 'sad', tags: '工作,告别', life: '24h', reads: 27, replies: 4, ageMin: 1,
    },
    {
      id: 'demo-003', author: 'prof-004', content: '复试前一晚路过这里，告诉自己：你已经够好了。',
      lat: baseLat + 0.00008, lng: baseLng - 0.00004, mood: 'anxious', tags: '考试,勇气', life: '24h', reads: 15, replies: 1, ageMin: 2,
    },
    {
      id: 'demo-004', author: 'prof-001', content: '雨停后的地面还在反光，像把心事暂时寄存在了这里。',
      lat: baseLat - 0.00004, lng: baseLng - 0.00007, mood: 'sad', tags: '雨天,心情', life: '7d', reads: 33, replies: 5, ageMin: 3,
    },
    {
      id: 'demo-005', author: 'prof-005', content: '给未来的自己：如果路过这里，记得你已经熬过了那段时间。',
      lat: baseLat + 0.00010, lng: baseLng + 0.00009, mood: 'happy', tags: '希望', life: 'permanent', reads: 41, replies: 6, ageMin: 4,
    },
    {
      id: 'demo-006', author: 'prof-002', content: '和闺蜜在这里拍过一张合影，今天一个人重新经过。',
      lat: baseLat + 0.00003, lng: baseLng - 0.00008, mood: 'love', tags: '友情,回忆', life: '7d', reads: 22, replies: 3, ageMin: 5,
    },
  ];

  const insertNote = db.prepare(`
    INSERT INTO notes (id, author_id, content, lat, lng, note_type, mood_tag, topic_tags, lifespan_type, expires_at, read_count, reply_count, created_at, moderation_status)
    VALUES (?, ?, ?, ?, ?, 'text', ?, ?, ?, ?, ?, ?, ?, 'approved')
  `);

  demoNotes.forEach((n) => {
    let expiresAt;
    if (n.life === '24h') expiresAt = fmt(new Date(now + 24 * 3600 * 1000));
    else if (n.life === '7d') expiresAt = fmt(new Date(now + 7 * 86400 * 1000));
    else expiresAt = '2099-12-31T00:00:00.000Z';
    const createdAt = fmt(new Date(now - n.ageMin * 60 * 1000));
    insertNote.run(n.id, n.author, n.content, n.lat, n.lng, n.mood, n.tags, n.life, expiresAt, n.reads, n.replies, createdAt);
  });
}

migrate();
seed();
cleanupJunkNotes();
refreshDemoNotes();

module.exports = { db, haversine };
