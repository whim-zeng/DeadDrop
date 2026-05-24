# SW-02 Database ER Diagram & Schema Documentation

## Overview

DeadDrop Core 使用 PostgreSQL 15 + PostGIS 3.4 作为数据核心。所有空间字段使用 `GEOGRAPHY(Point, 4326)` 类型，确保基于 WGS84 坐标系的精确地球表面距离计算。

---

## Entity Relationship Diagram

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│    profiles     │     │     notes       │     │   locations     │
├─────────────────┤     ├─────────────────┤     ├─────────────────┤
│ PK id (uuid)    │◄────┤ FK author_id    │     │ PK id (uuid)    │◄────┐
│    fingerprint  │     │ PK id (uuid)    │────►│ FK location_id  │     │
│    anonymous_c  │     │    content      │     │    name         │     │
│    nickname     │     │    voice_url    │     │    center(geo)  │     │
│    avatar_grad  │     │    location(geo)│     │    radius_m     │     │
│    created_at   │     │    note_type    │     │    location_ty  │     │
│    last_seen_a  │     │    mood_tag     │     │    agent_conf   │     │
└─────────────────┘     │    topic_tags   │     │    hot_score    │     │
         ▲              │    lifespan_ty  │     │    note_count   │     │
         │              │    expires_at   │     └─────────────────┘     │
         │              │    read_count   │                             │
         │              │    reply_count  │                             │
         │              │    is_pinned    │                             │
         │              │    moderation_  │                             │
         │              │    archived_at  │                             │
         │              │    content_pre  │                             │
         │              └─────────────────┘                             │
         │                       ▲                                     │
         │                       │                                     │
         │              ┌────────┴────────┐                            │
         │              │                 │                            │
         │     ┌────────┴────────┐ ┌─────┴───────────┐               │
         │     │    replies      │ │   note_reads    │               │
         │     ├─────────────────┤ ├─────────────────┤               │
         └─────┤ FK author_id    │ │ FK reader_id    │───────────────┘
               │ PK id (uuid)    │ │ PK id (uuid)    │
               │ FK note_id      │ │ FK note_id      │
               │ FK parent_id    │ │ reader_loc(geo) │
               │    content      │ │ distance_calc   │
               │    voice_url    │ │ read_at         │
               │    created_at   │ └─────────────────┘
               │    is_read      │
               └─────────────────┘
```

---

## Table Specifications

### 1. profiles — 匿名用户身份

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | uuid | PK, FK → auth.users | 与 Supabase Auth 关联 |
| `fingerprint_hash` | text | UNIQUE, NOT NULL | 设备指纹哈希 |
| `anonymous_code` | text | UNIQUE, NOT NULL | 匿名显示代号 |
| `nickname` | text | nullable | 用户自定义昵称 |
| `avatar_gradient` | text | DEFAULT 'blue' | 头像渐变色预设 |
| `created_at` | timestamptz | DEFAULT now() | 注册时间 |
| `last_seen_at` | timestamptz | DEFAULT now() | 最后活跃 |

**Indexes:**
- `idx_profiles_fingerprint` on `fingerprint_hash`
- `idx_profiles_anonymous_code` on `anonymous_code`

**RLS Policy:**
- Users can only access own profile: `auth.uid() = id`

---

### 2. locations — 地点元数据

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | uuid | PK, DEFAULT gen_random_uuid() | 地点唯一ID |
| `name` | text | NOT NULL | 地点名称 |
| `center` | geography(Point, 4326) | NOT NULL | 地点中心坐标 |
| `radius_meters` | int | DEFAULT 50 | 地点有效半径 |
| `location_type` | text | CHECK enum | 地点类型枚举 |
| `agent_config` | jsonb | nullable | AGENT 角色设定 |
| `brand_partner_id` | uuid | nullable | 品牌方关联 |
| `is_paid_channel` | boolean | DEFAULT false | 是否付费渠道 |
| `note_count` | int | DEFAULT 0 | 缓存：纸条数量 |
| `hot_score` | float | DEFAULT 0 | 缓存：热度分 |
| `created_at` | timestamptz | DEFAULT now() | 创建时间 |
| `updated_at` | timestamptz | DEFAULT now() | 更新时间 |

**Indexes:**
- `idx_locations_center` GiST on `center`
- `idx_locations_type` on `location_type`

---

### 3. notes — 纸条（核心表）

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | uuid | PK, DEFAULT gen_random_uuid() | 纸条唯一ID |
| `author_id` | uuid | FK → profiles, ON DELETE SET NULL | 作者 |
| `content` | text | NOT NULL, CHECK ≤500 | 文字内容 |
| `voice_url` | text | nullable | 语音文件URL |
| `voice_duration` | int | nullable | 语音时长(秒) |
| `location` | geography(Point, 4326) | NOT NULL | 投放位置 |
| `note_type` | text | DEFAULT 'text', CHECK enum | 类型：text/voice |
| `mood_tag` | text | CHECK enum | 情绪标签 |
| `topic_tags` | text[] | nullable | 话题标签数组 |
| `lifespan_type` | text | NOT NULL, CHECK enum | 生命周期类型 |
| `created_at` | timestamptz | DEFAULT now() | 创建时间 |
| `expires_at` | timestamptz | NOT NULL | 过期时间 |
| `read_count` | int | DEFAULT 0 | 阅读数 |
| `reply_count` | int | DEFAULT 0 | 回复数 |
| `is_pinned` | boolean | DEFAULT false | 品牌置顶 |
| `is_flagged` | boolean | DEFAULT false | AI审核标记 |
| `moderation_status` | text | DEFAULT 'pending', CHECK enum | 审核状态 |
| `location_id` | uuid | FK → locations | 关联地点 |
| `archived_at` | timestamptz | nullable | 归档时间(soft-delete) |
| `content_preview` | text | GENERATED | 前30字摘要 |

**Indexes:**
- `idx_notes_location` GiST on `location` *(性能关键)*
- `idx_notes_expires` on `expires_at` WHERE `archived_at IS NULL`
- `idx_notes_location_created` on `(location_id, created_at DESC)`
- `idx_notes_type_mood` on `(note_type, mood_tag)` WHERE `archived_at IS NULL`
- `idx_notes_topic_tags` GIN on `topic_tags` WHERE `archived_at IS NULL`
- `idx_notes_hot` on `(read_count DESC, reply_count DESC)` WHERE `archived_at IS NULL`

**RLS Policies:**
- SELECT: `archived_at IS NULL AND expires_at > now()`
- UPDATE/DELETE: `auth.uid() = author_id`
- INSERT: `auth.uid() = author_id`

---

### 4. replies — 匿名回复

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | uuid | PK, DEFAULT gen_random_uuid() | 回复唯一ID |
| `note_id` | uuid | FK → notes, ON DELETE CASCADE | 所属纸条 |
| `parent_id` | uuid | FK → replies, ON DELETE CASCADE | 父回复（嵌套） |
| `author_id` | uuid | FK → profiles, ON DELETE SET NULL | 作者 |
| `content` | text | NOT NULL, CHECK ≤300 | 文字内容 |
| `voice_url` | text | nullable | 语音URL |
| `voice_duration` | int | nullable | 语音时长 |
| `created_at` | timestamptz | DEFAULT now() | 创建时间 |
| `is_read` | boolean | DEFAULT false | 是否已读 |

**Constraints:**
- `max_nesting_depth`: 嵌套深度不超过2层（parent.parent_id 必须为 null）

**Indexes:**
- `idx_replies_note` on `(note_id, created_at DESC)`
- `idx_replies_parent` on `parent_id` WHERE `parent_id IS NOT NULL`

**RLS Policies:**
- SELECT: 关联纸条可读时回复可读
- INSERT: `auth.uid() = author_id`

---

### 5. note_reads — 阅读记录

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | uuid | PK, DEFAULT gen_random_uuid() | 记录唯一ID |
| `note_id` | uuid | FK → notes, ON DELETE CASCADE | 被阅读纸条 |
| `reader_id` | uuid | FK → profiles, ON DELETE CASCADE | 读者 |
| `reader_location` | geography(Point, 4326) | NOT NULL | 阅读时位置 |
| `distance_calculated` | float | nullable | 实际计算距离(米) |
| `read_at` | timestamptz | DEFAULT now() | 阅读时间 |

**Constraints:**
- UNIQUE(`note_id`, `reader_id`) — 同一用户只计一次

**Indexes:**
- `idx_note_reads_note` on `note_id`
- `idx_note_reads_reader` on `reader_id`
- `idx_note_reads_location` GiST on `reader_location`

---

## Database Triggers

| Trigger | Table | Event | Function | Purpose |
|---------|-------|-------|----------|---------|
| `trigger_extend_lifespan` | note_reads | AFTER INSERT | `extend_note_lifespan()` | 阅读时延长纸条寿命 |
| `trigger_increment_reply_count` | replies | AFTER INSERT | `increment_reply_count()` | 回复数+1 |
| `trigger_increment_read_count` | note_reads | AFTER INSERT | `increment_read_count()` | 阅读数+1 |
| `trigger_update_location_metadata` | notes | AFTER INSERT/UPDATE/DELETE | `update_location_metadata()` | 更新地点缓存计数 |

---

## Scheduled Jobs (pg_cron)

| Job Name | Schedule | Purpose |
|----------|----------|---------|
| `archive-expired-notes` | `0 * * * *` (hourly) | 归档过期纸条（soft-delete） |
| `cleanup-old-archives` | `0 3 * * *` (daily 3AM) | 删除90天前归档数据 |
| `update-location-hot-scores` | `*/10 * * * *` (every 10min) | 更新地点热度缓存 |

---

## Performance Considerations

### Spatial Query Optimization
- **GiST 索引** on `notes(location)` 是 P95 < 100ms 的关键
- `ST_DWithin` 配合 GiST 索引使用，避免全表扫描
- 网格聚合查询使用 `ST_SnapToGrid` 实现动态精度聚合

### Filter Index Strategy
- 组合索引 `(note_type, mood_tag)` 覆盖最常见的两维筛选
- GIN 索引 on `topic_tags[]` 支持数组包含查询
- 部分索引 (`WHERE archived_at IS NULL`) 减少索引体积

### Query Patterns
```sql
-- 50m 内空间查询（核心路径）
SELECT * FROM notes
WHERE archived_at IS NULL
  AND expires_at > now()
  AND ST_DWithin(location::geography, ST_GeogFromText('POINT(lng lat)'), 50)
ORDER BY location <-> ST_GeogFromText('POINT(lng lat)')
LIMIT 20;

-- 情绪筛选 + 时间范围
SELECT * FROM notes
WHERE mood_tag = 'sad'
  AND created_at > now() - interval '24 hours'
  AND archived_at IS NULL;

-- 话题标签搜索
SELECT * FROM notes
WHERE '失恋' = ANY(topic_tags)
  AND archived_at IS NULL;
```
