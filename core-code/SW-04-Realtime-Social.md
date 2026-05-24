# SW-04 实时通信与社交 — 开发提示词（优化版）

## 元信息
- **模块 ID**: SW-04
- **模块名称**: 实时通信与社交（匿名匹配 + 长期聊天）
- **所属域**: Software
- **执行阶段**: Phase 3（依赖 SW-01 + SW-02）
- **预估工期**: 2 周
- **版本**: v2（基于功能模块表优化，强调与"匿名回复/对话链"的衔接）

---

## 1. 模块边界与职责

### 核心职责
在 **匿名回复/对话链** 的基础上，建立"双向同意"的社交升级机制：纸条匿名回复 → 匹配邀请 → 长期聊天频道。同时负责全应用的消息实时推送。

### 按八大功能模块的支撑关系

| 功能模块 | 本模块支撑 |
|----------|-----------|
| 用户注册/匿名身份系统 | — |
| 地图与热力图浏览 | — |
| 附近纸条列表/预览 | — |
| 纸条搜索/筛选 | — |
| 位置验证 | — |
| 放下纸条（内容创作）| — |
| 捡起纸条（内容消费）| — |
| **匿名回复/对话链** | **Realtime 实时回复推送 + Presence 在线人数 + 匹配升级** |

### 明确包含
- **匿名回复实时推送**：回复发布后立即推送给纸条作者和正在看纸条的人
- **Presence 在线人数**：某纸条正在查看的实时在线人数
- **匹配邀请工作流**：回复者发起"长期聊天"邀请 → 原纸条作者收到通知 → 同意/拒绝
- **长期聊天频道**：双方同意后的 1v1 加密聊天（文字 + 语音）
- **消息推送**：新回复、匹配邀请、新消息的跨平台 Push
- **WebSocket 实时消息**：基于 Supabase Realtime 的广播
- **消息已读/未读状态**：双勾选机制

### 明确不包含
- 纸条 CRUD 与空间查询（属于 SW-02）
- App 前端页面渲染（属于 SW-01，但需提供 React Hooks）
- AGENT 对话（属于 SW-03）

---

## 2. 技术栈与约束

| 层级 | 选型 | 理由 |
|------|------|------|
| 实时通道 | Supabase Realtime (Broadcast + Presence) | 与后端同生态，WebSocket 自动重连 |
| 消息存储 | PostgreSQL（chat_rooms, chat_messages 表）| 与主数据一致，便于关联查询 |
| 推送 | Expo Push Notifications (iOS APNs + Android FCM) | 统一 SDK，React Native 集成成熟 |
| 语音消息 | Supabase Storage（预签名 URL）+ expo-av | 音频文件存储与播放 |
| 加密 | 端到端加密（E2EE）可选（Libsodium / NaCl）| 长期聊天隐私保护 |

### 非功能约束
- **实时性**: 消息投递延迟 < 500ms（同城）
- **可靠性**: 消息不丢失（至少一次投递 + 客户端去重）
- **并发**: 单聊天室支持 2 人（1v1），系统支持 10k 并发聊天室
- **隐私**: 长期聊天双方真实身份（profile ID）不暴露，仅显示匿名代号

---

## 3. 数据模型

### 3.1 匹配邀请表（连接对话链到长期聊天的桥梁）
```sql
create table match_requests (
  id uuid primary key default gen_random_uuid(),
  note_id uuid references notes(id) on delete cascade,
  reply_id uuid references replies(id) on delete cascade,
  requester_id uuid references profiles(id) on delete cascade,  -- 回复者（发起方）
  recipient_id uuid references profiles(id) on delete cascade,   -- 纸条作者（接收方）
  status text default 'pending' check (status in ('pending', 'accepted', 'rejected', 'expired')),
  requester_message text,  -- 可选附言（如"你的故事很有趣，想多聊聊"）
  created_at timestamptz default now(),
  responded_at timestamptz,
  expires_at timestamptz default now() + interval '7 days'
);
```

### 3.2 聊天室表（双方同意后创建）
```sql
create table chat_rooms (
  id uuid primary key default gen_random_uuid(),
  match_request_id uuid references match_requests(id),
  participant_a_id uuid references profiles(id),  -- 纸条作者
  participant_b_id uuid references profiles(id),  -- 回复者
  created_at timestamptz default now(),
  last_message_at timestamptz,
  last_message_preview text,
  is_active boolean default true,
  deleted_by_a_at timestamptz,  -- 软删除（单方退出仍可被对方看到）
  deleted_by_b_at timestamptz
);
```

### 3.3 消息表
```sql
create table chat_messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references chat_rooms(id) on delete cascade,
  sender_id uuid references profiles(id),
  sender_code text,            -- 冗余存储匿名代号（避免联表）
  content text,                -- 文字内容
  voice_url text,              -- 语音消息 Storage URL
  voice_duration int,          -- 秒
  message_type text default 'text' check (message_type in ('text', 'voice', 'system')),
  created_at timestamptz default now(),
  edited_at timestamptz,
  deleted_at timestamptz,      -- 撤回
  read_by_recipient_at timestamptz
);
```

### 3.4 推送设备令牌表
```sql
create table push_tokens (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) on delete cascade,
  token text not null,
  platform text check (platform in ('ios', 'android')),
  updated_at timestamptz default now()
);
```

---

## 4. 核心流程

### 4.1 匿名回复实时推送（支撑：匿名回复/对话链）
```
用户 A 在某纸条详情页发布回复
    ├──→ POST /replies
    ├──→ 服务端：
    │       ├── 存入 replies 表
    │       ├── note.reply_count++
    │       ├── Realtime Broadcast → 'note:{noteId}' 频道
    │       │       事件：'new_reply'
    │       │       数据：{ replyId, authorCode, content, createdAt }
    │       │
    │       ├── Presence 检查：纸条作者是否在线
    │       │       ├── 在线 → 仅 Realtime（不发 Push）
    │       │       └── 离线 → Push Notification
    │       │               "有人回复了你的纸条：'{内容前 20 字}...'"
    │       │
    │       └── 其他正在看此纸条的在线用户 → Realtime 实时追加回复
    │
    └──→ 客户端（所有订阅 'note:{noteId}' 的用户）：
            ├── 回复列表实时追加新回复（带动画）
            └── 底部显示 "XX 刚刚回复了此纸条" 临时提示
```

### 4.2 Presence 在线人数（支撑：匿名回复/对话链）
```typescript
// 客户端实现
const channel = supabase.channel('note:' + noteId);

channel
  .on('presence', { event: 'sync' }, () => {
    const state = channel.presenceState();
    const onlineCount = Object.keys(state).length;
    // UI 显示："3 人正在看此纸条"
  })
  .subscribe(async (status) => {
    if (status === 'SUBSCRIBED') {
      await channel.track({ 
        user_id: profileId, 
        online_at: new Date().toISOString(),
        // 匿名显示，不暴露真实 ID
        display_code: anonymousCode 
      });
    }
  });
```

### 4.3 匹配邀请流程（从对话链升级到长期聊天）
```
用户 B（回复者）在对话链中发起匹配
    ├──→ 点击"想和 TA 长期聊天"
    ├──→ 填写可选附言（"我觉得你的故事很有趣..."）
    ├──→ POST /match-requests
    │       创建 match_requests（status=pending）
    │
    └──→ 纸条作者（用户 A）收到：
         ├── 推送："有人想和你建立长期聊天"
         ├── 应用内通知中心红点
         └── Realtime：如果正在 MatchRequestScreen，实时刷新

用户 A 处理邀请
    ├──→ 同意：
    │       ├── match_requests.status = 'accepted'
    │       ├── 创建 chat_rooms 记录
    │       ├── 双方进入 ChatRoomScreen
    │       └── 推送通知 B："对方同意了你的邀请，开始聊天吧"
    │
    └──→ 拒绝：
            ├── match_requests.status = 'rejected'
            ├── 24h 内 B 不可再次邀请同一条纸条
            └── 静默处理，B 不收到明确拒绝通知（保护 A）
```

### 4.4 长期聊天消息流
```
用户 A 发送消息
    ├──→ 客户端乐观渲染（先显示，后确认）
    ├──→ POST /chat-messages
    ├──→ 服务端：
    │       ├── 存入 chat_messages
    │       ├── 更新 chat_rooms.last_message_at
    │       ├── Realtime Broadcast 到 'chat:' + roomId 频道
    │       └── 若 B 不在线，发送 Push Notification
    │
    └──→ B 收到：
         ├── 在线：Realtime 消息实时显示 + 播放提示音
         └── 离线：Push 点击后进入对应 ChatRoomScreen

已读追踪
    ├──→ B 打开 ChatRoomScreen
    ├──→ 客户端发送 read_receipt 事件
    ├──→ 服务端更新 chat_messages.read_by_recipient_at
    └──→ A 端实时收到已读状态（双勾选变蓝）
```

---

## 5. API 规范

```typescript
// 发起匹配邀请
POST /functions/v1/match-requests
Body: { replyId: string, message?: string }
Response: { id: string, status: 'pending', expiresAt: string }

// 处理匹配邀请
PATCH /functions/v1/match-requests/:id
Body: { status: 'accepted' | 'rejected' }
Response: { status: string, chatRoomId?: string }

// 获取聊天室列表
GET /functions/v1/chat-rooms
Response: { 
  rooms: Array<{ 
    id: string; 
    participantCode: string;      // 匿名代号
    lastMessagePreview: string;
    lastMessageAt: string;
    unreadCount: number;
  }> 
}

// 发送消息
POST /functions/v1/chat-messages
Body: { roomId: string, content?: string, voiceKey?: string }
Response: { id: string, createdAt: string, status: 'delivered' }

// 标记已读
POST /functions/v1/chat-messages/read
Body: { roomId: string }
Response: { updatedCount: number }
```

### Realtime 订阅规范
```typescript
// 订阅纸条实时回复
const noteChannel = supabase
  .channel('note:' + noteId)
  .on('broadcast', { event: 'new_reply' }, (payload) => {
    // 新回复到达，追加到对话链
  })
  .on('presence', { event: 'sync' }, () => {
    // 更新"X 人正在看此纸条"
  })
  .subscribe();

// 订阅聊天室消息
const chatChannel = supabase
  .channel('chat:' + roomId)
  .on('broadcast', { event: 'message' }, (payload) => {
    // 新聊天消息到达
  })
  .on('broadcast', { event: 'read_receipt' }, (payload) => {
    // 对方已读
  })
  .subscribe();
```

---

## 6. 推送通知策略

| 场景 | 标题 | 内容 | 点击行为 |
|------|------|------|----------|
| 新回复 | "有人回复了你的纸条" | "{匿名代号}：{内容前 20 字}..." | 打开纸条详情 |
| 匹配邀请 | "有人想和你聊天" | "来自你的一张纸条的回复者" | 打开 MatchRequestScreen |
| 匹配成功 | "开始聊天吧" | "{匿名代号} 同意了你的邀请" | 打开 ChatRoomScreen |
| 新消息 | "{匿名代号}" | "{内容前 20 字}..." | 打开对应聊天室 |

---

## 7. 验收标准

### AC-1: 匿名回复实时推送（支撑对话链）
- [ ] 用户发布回复后，纸条作者 500ms 内收到通知（在线 Realtime / 离线 Push）
- [ ] 正在看同一张纸条的其他用户实时看到新回复追加
- [ ] 回复列表滚动到底部时，新回复自动出现（带动画）
- [ ] 离线用户打开 App 后，未读回复正确显示红点

### AC-2: Presence 在线人数
- [ ] 纸条详情页显示"X 人正在看此纸条"
- [ ] 用户离开页面后 30s 内，在线人数自动减少
- [ ] Presence 不暴露用户真实身份，仅统计人数

### AC-3: 匹配邀请
- [ ] 回复者可发起匹配邀请，附言可选
- [ ] 纸条作者收到邀请后可同意或拒绝
- [ ] 拒绝后 24h 内同一回复者不能再次邀请
- [ ] 邀请 7 天未处理自动过期

### AC-4: 长期聊天
- [ ] 双方同意后自动创建 1v1 聊天室
- [ ] 支持文字和语音消息
- [ ] 消息实时投递，延迟 < 500ms
- [ ] 已读状态实时同步（双勾选机制）
- [ ] 聊天记录支持本地缓存（SQLite）

### AC-5: 推送
- [ ] iOS 和 Android 均能收到推送
- [ ] 点击推送正确跳转到对应页面
- [ ] 用户可关闭某类推送（设置页）

---

## 8. 产物清单

- [ ] `supabase/migrations/` 聊天相关表迁移
- [ ] `supabase/functions/match-requests/` 匹配邀请 Edge Function
- [ ] `supabase/functions/chat-messages/` 消息 Edge Function
- [ ] `supabase/functions/push-notify/` 推送触发 Edge Function
- [ ] `src/hooks/useRealtimeReplies.ts` 实时回复订阅 Hook
- [ ] `src/hooks/useNotePresence.ts` 纸条在线人数 Hook
- [ ] `src/hooks/useChat.ts` 聊天室订阅、发送、已读 Hook
- [ ] `src/hooks/useMatchRequests.ts` 匹配邀请管理 Hook
- [ ] `docs/SW-04-MESSAGE-FLOW.md` 消息时序图
- [ ] `docs/SW-04-PUSH-CONFIG.md` 推送证书与配置文档
