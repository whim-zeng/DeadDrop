# SW-02 后端服务与空间数据 — 开发提示词（优化版）

## 元信息
- **模块 ID**: SW-02
- **模块名称**: 后端服务与空间数据（DeadDrop Core）
- **所属域**: Software
- **执行阶段**: Phase 1（最先启动，所有模块依赖）
- **预估工期**: 2-3 周
- **版本**: v2（基于功能模块表优化，补充搜索筛选、情绪标签、位置验证）

---

## 1. 模块边界与职责

### 核心职责
构建 DeadDrop 的数据核心：以 **PostGIS 空间数据库** 为中心，支撑 **入口→发现→核心** 三大流程阶段的全部数据需求。

### 明确包含（按八大功能模块支撑）

| 功能模块 | 后端支撑 |
|----------|----------|
| 用户注册/匿名身份系统 | 匿名用户表（设备指纹 + 匿名代号 + 头像颜色）|
| 地图与热力图浏览 | 空间聚合查询（网格热力图数据 API）|
| 附近纸条列表/预览 | 距离分层查询（50m 内全文 / 50-200m 摘要 / 200m+ 聚合）|
| 纸条搜索/筛选 | 多维度筛选索引（类型 / 情绪 / 话题 / 时间）|
| 位置验证 | ST_Distance 精确计算 + Mock 检测 + 容差策略 |
| 放下纸条（内容创作）| 纸条 CRUD + 情绪/话题标签存储 + 语音文件存储 |
| 捡起纸条（内容消费）| 阅读计数 + 延寿逻辑 + 阅读记录防刷 |
| 匿名回复/对话链 | 嵌套回复表 + Realtime 广播 +  Presence 在线人数 |

### 明确不包含
- 前端 UI 实现（属于 SW-01）
- AI 模型调用与内容审核（属于 SW-03，但需预留审核状态字段）
- 实时聊天消息路由（属于 SW-04）
- 运营后台界面（属于 SW-05）

---

## 2. 技术栈与约束

| 层级 | 选型 | 理由 |
|------|------|------|
| 数据库 | PostgreSQL 15 + PostGIS 3.4 | 原生空间数据支持，GEOGRAPHY 类型精确地球表面计算 |
| BaaS | Supabase | 开箱即用 Auth、Realtime、Storage、Edge Functions |
| 服务端逻辑 | Supabase Edge Functions (Deno + TypeScript) | 轻量、无服务器、与数据库同网延迟低 |
| 文件存储 | Supabase Storage | 语音纸条音频文件存储 |
| 调度 | pg_cron (Supabase 扩展) | 定时清理过期纸条 |

### 非功能约束
- **空间查询延迟**: ST_DWithin 50m 查询 P95 < 100ms（notes 表百万级数据需 GiST 索引）
- **并发**: 支持 1000 QPS 空间查询（连接池 + 索引优化）
- **数据保留**: 过期纸条 soft-delete（移至 archive 表），保留 90 天后物理删除
- **坐标系**: 使用 EPSG:4326 (WGS84)，PostGIS GEOGRAPHY 类型自动处理球面距离

---

## 3. 数据库 Schema 设计（核心表）

### 3.1 匿名用户表（支撑：用户注册/匿名身份系统）
```sql
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  fingerprint_hash text unique not null,  -- 设备指纹哈希
  anonymous_code text unique not null,     -- 匿名代号：如"孤独的美食家_2847"
  nickname text,                           -- 可选自定义昵称
  avatar_gradient text default 'blue',     -- 头像渐变色预设名
  created_at timestamptz default now(),
  last_seen_at timestamptz default now()
);

create index idx_profiles_fingerprint on profiles(fingerprint_hash);
create index idx_profiles_anonymous_code on profiles(anonymous_code);
```

### 3.2 纸条表（支撑：发现 + 核心全部功能）
```sql
create table notes (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references profiles(id) on delete set null,
  content text not null check (length(content) <= 500),
  voice_url text,                          -- Supabase Storage URL
  voice_duration int,                      -- 语音时长（秒）
  location geography(Point, 4326) not null, -- PostGIS 地理点
  
  -- 筛选标签（支撑：纸条搜索/筛选）
  note_type text default 'text' check (note_type in ('text', 'voice')),
  mood_tag text check (mood_tag in ('happy', 'sad', 'angry', 'anxious', 'love', 'thought', 'rant')),
  topic_tags text[],                       -- 话题标签数组，如 {'失恋', '考试'}
  
  -- 生命周期
  lifespan_type text not null check (lifespan_type in ('24h', '7d', 'permanent')),
  created_at timestamptz default now(),
  expires_at timestamptz not null,
  read_count int default 0,
  reply_count int default 0,
  
  -- 运营标记
  is_pinned boolean default false,         -- 品牌投放置顶
  is_flagged boolean default false,        -- AI 审核标记
  moderation_status text default 'pending' check (moderation_status in ('pending', 'approved', 'rejected')),
  
  -- 地点关联
  location_id uuid references locations(id),
  archived_at timestamptz,                 -- soft-delete
  
  -- 内容摘要（支撑：50-200m 预览区）
  content_preview text generated always as (substring(content from 1 for 30)) stored
);

-- 核心索引（性能关键）
create index idx_notes_location on notes using gist(location);
create index idx_notes_expires on notes(expires_at) where archived_at is null;
create index idx_notes_location_created on notes(location_id, created_at desc);

-- 筛选索引（支撑：纸条搜索/筛选）
create index idx_notes_type_mood on notes(note_type, mood_tag) where archived_at is null;
create index idx_notes_topic_tags on notes using gin(topic_tags) where archived_at is null;
create index idx_notes_hot on notes(read_count desc, reply_count desc) where archived_at is null;
```

### 3.3 回复表（支撑：匿名回复/对话链）
```sql
create table replies (
  id uuid primary key default gen_random_uuid(),
  note_id uuid references notes(id) on delete cascade,
  parent_id uuid references replies(id) on delete cascade, -- 嵌套回复（最大2层）
  author_id uuid references profiles(id) on delete set null,
  content text not null check (length(content) <= 300),
  voice_url text,
  voice_duration int,
  created_at timestamptz default now(),
  is_read boolean default false
);

create index idx_replies_note on replies(note_id, created_at desc);
create index idx_replies_parent on replies(parent_id) where parent_id is not null;
```

### 3.4 阅读记录表（支撑：位置验证 + 捡起纸条 + 延寿逻辑）
```sql
create table note_reads (
  id uuid primary key default gen_random_uuid(),
  note_id uuid references notes(id) on delete cascade,
  reader_id uuid references profiles(id) on delete cascade,
  reader_location geography(Point, 4326) not null, -- 校验 50m 内 + 防刷分析
  distance_calculated float,                      -- 实际计算距离（米）
  read_at timestamptz default now(),
  unique(note_id, reader_id)                      -- 同一用户只计一次
);

create index idx_note_reads_note on note_reads(note_id);
create index idx_note_reads_reader on note_reads(reader_id);
```

### 3.5 地点元数据表（支撑：AGENT + 品牌 + 热力图聚合）
```sql
create table locations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  center geography(Point, 4326) not null,
  radius_meters int default 50,
  location_type text check (location_type in ('generic', 'restaurant', 'scenic', 'campus', 'hospital', 'hotel', 'brand')),
  agent_config jsonb,                      -- AGENT 角色设定
  brand_partner_id uuid,                   -- 品牌方关联
  is_paid_channel boolean default false,
  note_count int default 0,                -- 缓存：该地点纸条数量
  hot_score float default 0,               -- 缓存：热度分（阅读+回复加权）
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_locations_center on locations using gist(center);
create index idx_locations_type on locations(location_type);
```

---

## 4. API 接口规范

### 4.1 空间查询 — 距离分层（支撑：附近纸条列表/预览）
```typescript
// GET /functions/v1/notes/nearby
interface NearbyRequest {
  lat: number;           // -90 ~ 90
  lng: number;           // -180 ~ 180
  user_accuracy?: number; // GPS 精度（米），用于容差计算
}

interface NearbyResponse {
  // 50m 内：完整纸条，可阅读全文
  unlocked: Array<{
    id: string;
    content: string;           // 完整内容
    contentPreview: string;    // 前 30 字（冗余方便客户端）
    voiceDuration?: number;
    distance: number;          // 精确到米
    lat: number;
    lng: number;
    authorCode: string;        // 匿名代号
    authorNickname?: string;
    moodTag: string;           // 情绪标签
    topicTags: string[];
    noteType: 'text' | 'voice';
    lifespanType: '24h' | '7d' | 'permanent';
    expiresAt: string;
    readCount: number;
    replyCount: number;
    isRead: boolean;
    isAgentLocation: boolean;
  }>;
  
  // 50-200m：仅摘要，不揭示全文
  preview: Array<{
    id: string;
    contentPreview: string;    // 仅 30 字摘要
    distance: number;
    lat: number;
    lng: number;
    noteType: 'text' | 'voice';
    moodTag: string;
    readCount: number;         // 显示热度
  }>;
  
  // 200m+：仅聚合数量提示
  distant: Array<{
    lat: number;
    lng: number;
    count: number;
    centerDistance: number;    // 距用户的距离
  }>;
  
  summary: {
    total: number;
    unlockedCount: number;
    previewCount: number;
    distantCount: number;
  };
  
  locationId?: string;          // 如果用户在某注册地点半径内
}
```

### 4.2 筛选查询（支撑：纸条搜索/筛选）
```typescript
// GET /functions/v1/notes/nearby?filter_type=voice&filter_mood=sad&filter_topic=失恋&filter_time=24h&sort_by=reads

interface FilterParams {
  lat: number;
  lng: number;
  filter_type?: 'all' | 'text' | 'voice';
  filter_mood?: 'happy' | 'sad' | 'angry' | 'anxious' | 'love' | 'thought' | 'rant';
  filter_topic?: string;        // 话题标签关键词
  filter_time?: '1h' | '24h' | '7d' | '30d';
  filter_lifespan?: 'expiring' | 'hot' | 'permanent'; // 即将过期 / 热门 / 永久
  sort_by?: 'recent' | 'distance' | 'reads' | 'replies';
  limit?: number;               // default 20, max 100
  offset?: number;
}
```

### 4.3 热力图聚合查询（支撑：地图与热力图浏览）
```typescript
// GET /functions/v1/notes/heatmap
interface HeatmapRequest {
  north: number;        // 视口边界
  south: number;
  east: number;
  west: number;
  zoom: number;         // 地图缩放级别，决定聚合粒度
  time_range?: '24h' | '7d' | '30d';
  filter_mood?: string; // 情绪筛选（可选，"只看告白"模式）
}

interface HeatmapResponse {
  grids: Array<{
    grid_lat: number;     // 网格中心纬度
    grid_lng: number;     // 网格中心经度
    note_count: number;   // 该网格纸条数
    total_reads: number;  // 总阅读数（用于热力权重）
    avg_mood?: string;    // 主导情绪（可选）
  }>;
  total_grids: number;
}

// 服务端聚合逻辑（按缩放级别动态调整网格精度）
// zoom >= 15:  0.001° 网格（约 100m）
// zoom 12-14:  0.005° 网格（约 500m）
// zoom < 12:   0.01° 网格（约 1km）
```

### 4.4 发布纸条（支撑：放下纸条）
```typescript
// POST /functions/v1/notes
interface CreateNoteRequest {
  content: string;            // 1-500 字
  voiceKey?: string;          // Supabase Storage upload key
  lat: number;
  lng: number;
  lifespanType: '24h' | '7d' | 'permanent';
  moodTag?: 'happy' | 'sad' | 'angry' | 'anxious' | 'love' | 'thought' | 'rant';
  topicTags?: string[];       // 最多 3 个话题标签
}

// 服务端逻辑：
// 1. RLS 校验用户身份
// 2. 计算 expires_at：24h→now+24h, 7d→now+7d, permanent→null
// 3. 查找最近 location（ST_DWithin 50m），匹配则关联
// 4. 如果话题标签为空 → 调用 SW-03 NLP 接口自动提取
// 5. 插入 notes，返回完整记录
// 6. 触发 Realtime 广播：附近在线用户收到新纸条通知
```

### 4.5 阅读纸条 — 带位置验证（支撑：位置验证 + 捡起纸条）
```typescript
// POST /functions/v1/notes/:id/read
interface ReadNoteRequest {
  readerLat: number;
  readerLng: number;
  readerAccuracy?: number;    // GPS 精度
}

interface ReadNoteResponse {
  note: {
    id: string;
    content: string;          // 完整内容（验证通过后返回）
    voiceUrl?: string;
    authorCode: string;
    moodTag: string;
    topicTags: string[];
    createdAt: string;
    readCount: number;
    lifespanType: string;
    expiresAt: string;
  };
  replies: Array<Reply>;      // 回复对话链
  isFirstRead: boolean;       // 是否首次阅读（用于触发延寿）
  distance: number;           // 实际计算距离
  unlocked: boolean;          // 是否成功解锁
}

// 服务端逻辑：
// 1. 校验 note_id 存在且未过期、未归档
// 2. 计算 reader_location 与 note.location 的 ST_Distance
// 3. 容差计算：
//    - accuracy < 20m:  threshold = 50m
//    - accuracy 20-50m: threshold = 70m
//    - accuracy > 50m:  threshold = 100m（并记录警告日志）
// 4. 若 distance > threshold → 403 Forbidden
//    Response: { unlocked: false, distance, requiredDistance: threshold }
// 5. Mock 检测：检查 GPS 坐标是否合理（速度 < 200km/h，不在已知 Mock 位置库中）
// 6. 若 reader_id 未读过 → read_count++，插入 note_reads，触发延寿
// 7. 返回完整内容 + 回复列表
```

### 4.6 匿名回复（支撑：匿名回复/对话链）
```typescript
// POST /functions/v1/notes/:id/replies
interface CreateReplyRequest {
  content?: string;           // 文字，最大 300 字
  voiceKey?: string;          // 语音 Storage key
  parentId?: string;          // 回复某条回复（嵌套），null 则为顶层回复
}

// 服务端逻辑：
// 1. 校验 note 存在且可读
// 2. 校验 parent_id 若存在，层级不超过 2（parent.parent_id 必须为 null）
// 3. 插入 replies，note.reply_count++
// 4. Realtime Broadcast：向 note 频道发送 'new_reply' 事件
// 5. Push Notification：通知纸条作者（如果作者在线则不推）
```

### 4.7 Presence — 在线人数（支撑：匿名回复/对话链）
```typescript
// 客户端通过 Supabase Realtime Presence 实现
// channel = supabase.channel('note:' + noteId)
// channel.subscribe(async (status) => {
//   if (status === 'SUBSCRIBED') {
//     await channel.track({ user_id: profileId, online_at: new Date().toISOString() })
//   }
// })
// channel.on('presence', { event: 'sync' }, () => {
//   const state = channel.presenceState()
//   const onlineCount = Object.keys(state).length
// })
```

---

## 5. 生命周期延寿规则

```typescript
// 每次新增阅读时触发（Database Trigger）
function extendLifespan(note: Note): Date | null {
  if (note.lifespanType === 'permanent') return null;
  
  const baseHours = note.lifespanType === '24h' ? 24 : 168;
  // 每次阅读 +2h，最多翻倍
  const extension = Math.min(note.read_count * 2, baseHours);
  const newExpiresAt = new Date(
    note.created_at.getTime() + (baseHours + extension) * 3600 * 1000
  );
  
  return newExpiresAt;
}
```

---

## 6. 行级安全策略（RLS）

```sql
-- profiles：用户只能读写自己的资料
alter table profiles enable row level security;
create policy "Users can only access own profile"
  on profiles for all
  using (auth.uid() = id);

-- notes：所有人可读未过期纸条；作者可删改自己的
alter table notes enable row level security;
create policy "Notes are readable by all if not archived"
  on notes for select
  using (archived_at is null and expires_at > now());

create policy "Authors can update own notes"
  on notes for update
  using (auth.uid() = author_id);

-- replies：关联纸条可读则回复可读
alter table replies enable row level security;
create policy "Replies readable if note is readable"
  on replies for select
  using (exists (
    select 1 from notes where notes.id = replies.note_id and notes.archived_at is null
  ));
```

---

## 7. 定时任务（pg_cron）

```sql
-- 每小时归档过期纸条
select cron.schedule('archive-expired-notes', '0 * * * *', $$
  update notes set archived_at = now() 
  where archived_at is null 
    and expires_at < now() 
    and lifespan_type != 'permanent'
$$);

-- 每天凌晨清理 90 天前归档数据
select cron.schedule('cleanup-old-archives', '0 3 * * *', $$
  delete from notes where archived_at < now() - interval '90 days'
$$);

-- 每 10 分钟更新地点热度缓存
select cron.schedule('update-location-hot-scores', '*/10 * * * *', $$
  update locations 
  set hot_score = sub.hot_score,
      note_count = sub.note_count,
      updated_at = now()
  from (
    select location_id, 
           count(*) as note_count,
           sum(read_count + reply_count * 2) as hot_score
    from notes 
    where archived_at is null 
    group by location_id
  ) sub
  where locations.id = sub.location_id
$$);
```

---

## 8. 验收标准

### AC-1: 数据库与索引
- [ ] 所有核心表按 Schema 创建成功
- [ ] GiST 空间索引在 100 万条模拟数据下，50m 半径查询 P95 < 100ms
- [ ] 筛选索引（mood_tag, topic_tags, note_type）支持快速多维度筛选
- [ ] RLS 策略经渗透测试：未认证用户无法读写受限数据

### AC-2: 距离分层查询
- [ ] `/nearby` 正确返回 unlocked(50m内) / preview(50-200m) / distant(200m+) 三层数据
- [ ] 预览区只返回 content_preview（30 字），不返回全文
- [ ] 200m+ 区域返回聚合数量，不返回单条数据
- [ ] 摘要信息包含距离、情绪标签、纸条类型

### AC-3: 筛选与搜索
- [ ] 支持按类型（text/voice）、情绪（7种）、话题、时间范围组合筛选
- [ ] 筛选后地图热力图数据同步变化
- [ ] 排序方式（最近/距离/阅读/回复）正常工作

### AC-4: 位置验证
- [ ] 阅读接口在 >50m 时返回 403，提示剩余距离
- [ ] GPS 精度差时自动放宽容差（20-50m → 70m）
- [ ] Mock 位置检测有效，拒绝作弊解锁
- [ ] 阅读计数正确累加，生命周期按规则延长

### AC-5: 热力图聚合
- [ ] 按视口边界和缩放级别正确聚合
- [ ] 10 万级数据下聚合查询 < 500ms
- [ ] 支持情绪筛选后的热力图（"只看告白"模式）

### AC-6: 匿名回复
- [ ] 回复支持嵌套（最大 2 层）
- [ ] 新回复通过 Realtime 实时广播
- [ ] Presence 在线人数准确显示

### AC-7: 集成就绪
- [ ] 向 SW-01 提供完整的 API 文档（OpenAPI 3.0）
- [ ] 向 SW-03 暴露 `notes` 表变更事件（Realtime），触发 AGENT 更新
- [ ] 向 SW-04 提供 `profiles` + `replies` 的 Realtime 订阅接口
- [ ] 向 SW-05 提供聚合查询接口（热力图数据、运营统计）

---

## 9. 产物清单

- [ ] `supabase/migrations/` 完整数据库迁移文件
- [ ] `supabase/functions/` Edge Functions 源码
  - `notes-nearby/` 附近纸条查询（距离分层）
  - `notes-heatmap/` 热力图聚合查询
  - `notes-read/` 阅读纸条（位置验证）
  - `notes-create/` 发布纸条
  - `replies/` 匿名回复
- [ ] `docs/SW-02-API-SPEC.yaml` OpenAPI 3.0 规范
- [ ] `docs/SW-02-DATABASE-DIAGRAM.md` ER 图与字段说明
- [ ] `docs/SW-02-SECURITY-AUDIT.md` RLS 策略与安全审查记录
- [ ] `seed.sql` 开发环境测试数据（含模拟地理位置 + 情绪标签）
