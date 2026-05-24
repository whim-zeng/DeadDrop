# SW-05 运营与数据可视化 — 开发提示词（优化版）

## 元信息
- **模块 ID**: SW-05
- **模块名称**: 运营与数据可视化（全景地图 + 品牌后台 + 内容审核）
- **所属域**: Software
- **执行阶段**: Phase 3（依赖 SW-02 + SW-03）
- **预估工期**: 2 周
- **版本**: v2（基于功能模块表优化，强化审核队列与情绪数据可视化）

---

## 1. 模块边界与职责

### 核心职责
为运营团队、品牌合作方提供数据可视化后台：纸条全景地图（热力图）、**内容审核队列**、品牌投放管理、用户行为分析。同时为 C 端"地图与热力图浏览"提供 B 端数据支撑。

### 按八大功能模块的支撑关系

| 功能模块 | 本模块支撑 |
|----------|-----------|
| 用户注册/匿名身份系统 | 用户统计、匿名身份管理 |
| **地图与热力图浏览** | **全景热力图数据、地点管理** |
| 附近纸条列表/预览 | 纸条管理、违规内容处理 |
| **纸条搜索/筛选** | **情绪/话题分布分析** |
| 位置验证 | — |
| 放下纸条（内容创作）| **内容审核队列** |
| 捡起纸条（内容消费）| 阅读数据报表 |
| 匿名回复/对话链 | 回复统计、话题热度 |

### 明确包含
- **纸条全景地图**：全量纸条地理分布热力图（C 端 + B 端）
- **内容审核队列**：
  - AI 标记为"模糊"的内容人工复核
  - 快速操作：通过 / 拒绝 / 标记人工
  - 审核日志完整记录
- **情绪与话题数据看板**：
  - 全站情绪分布饼图（7 种情绪占比）
  - 热门话题 Top 20（按地点/时间维度）
  - "情绪地图"：不同区域的主导情绪可视化
- **运营后台**：
  - 纸条管理（查看、隐藏、删除违规内容）
  - 用户管理（封禁、限制发布）
  - 地点管理（创建/编辑地点、配置 AGENT）
- **品牌合作后台**：
  - 品牌方注册与认证
  - 在指定地点"投放"优惠券/广告纸条
  - 投放数据报表（曝光、阅读、转化）
- **数据仪表盘**：DAU、纸条发布量、热门地点、留存率

### 明确不包含
- 移动端 App 主界面（属于 SW-01）
- 后端数据库设计（属于 SW-02，但需扩展品牌相关表）
- AI 审核逻辑（属于 SW-03，但需消费审核结果数据）

---

## 2. 技术栈与约束

| 层级 | 选型 | 理由 |
|------|------|------|
| 前端框架 | React 18 + Vite | 后台系统无需 RN，Web 性能更好 |
| UI 组件库 | Ant Design Pro / Refine | 后台 CRUD 快速搭建 |
| 地图可视化 | Mapbox GL JS / Deck.gl | 海量点数据 + 热力图性能优秀 |
| 图表 | Apache ECharts | 中文文档完善，仪表盘场景丰富 |
| 后端查询 | Supabase REST API + RPC 聚合函数 | 复用已有数据层 |
| 权限 | RBAC（Role-Based Access Control）| 运营 / 品牌方 / 超级管理员 |

### 非功能约束
- **热力图性能**: 10 万级纸条点在大视口下渲染流畅（WebGL 聚合）
- **数据延迟**: 运营报表 T+1（每日凌晨聚合），实时监控 5min 延迟
- **权限隔离**: 品牌方只能看到与自己投放相关的数据

---

## 3. 页面架构

```
Admin Dashboard (React Router)
├── /login                    [统一登录（Supabase Auth）]
├── /dashboard                [数据总览]
│   ├── DAU/MAU 趋势
│   ├── 纸条发布量（时/日/周）
│   ├── 情绪分布饼图（7 种情绪占比）
│   ├── 热门话题 Top 20
│   ├── 热门地点 Top 20
│   └── 用户留存漏斗
│
├── /heatmap                  [纸条全景地图]
│   ├── 全局热力图（所有纸条）
│   ├── 情绪地图模式（按情绪类型渲染不同颜色）
│   ├── 按时间筛选（24h / 7d / 30d）
│   ├── 按情绪筛选（"只看告白" / "只看吐槽" 等）
│   ├── 按类型筛选（文字 / 语音 / 品牌）
│   └── 点击点查看纸条详情弹窗
│
├── /moderation               [内容审核队列]
│   ├── 待复核列表（AI 标记为模糊的）
│   ├── 快捷审核面板（内容 + AI 分数 + 快速操作按钮）
│   ├── 已拦截记录
│   ├── 审核统计（通过率、拦截率、平均处理时间）
│   └── 批量处理
│
├── /notes                    [纸条管理]
│   ├── 全量列表（搜索、筛选、排序）
│   ├── 筛选维度：情绪 / 话题 / 地点 / 时间 / 审核状态
│   ├── 单条操作：查看 / 隐藏 / 删除
│   └── 批量导出
│
├── /locations                [地点管理]
│   ├── 地点列表（热度排序）
│   ├── 创建地点（地图上选点）
│   ├── 地点详情（纸条数、情绪分布、AGENT 配置）
│   └── AGENT 配置编辑
│
├── /topics                   [话题分析（新增）]
│   ├── 热门话题趋势图
│   ├── 话题-地点关联矩阵
│   ├── 话题情绪分析（每个话题的主导情绪）
│   └── 新兴话题预警（24h 内突然增长的话题）
│
├── /brand-partners           [品牌合作方管理]
│   ├── 品牌方列表
│   ├── 审核入驻申请
│   └── 投放额度管理
│
└── /brand-console            [品牌方专属后台]
    ├── 我的投放纸条
    ├── 投放效果报表
    ├── 创建新投放（选地点、写内容、设预算）
    └── 账户充值/消费记录
```

---

## 4. 核心功能详解

### 4.1 全景热力图（支撑：地图与热力图浏览）
```typescript
// 热力图数据聚合（按地图视口 + 缩放级别）
// 使用 Deck.gl HexagonLayer 或 HeatmapLayer

interface HeatmapDataPoint {
  lat: number;
  lng: number;
  weight: number;        // 纸条热度（阅读数 + 回复数加权）
  timestamp: string;
  type: 'user' | 'brand';
  mood_tag?: string;     // 情绪标签（情绪地图模式使用）
}

// 聚合查询（Supabase RPC）
// 按网格聚合，减少传输数据量
select 
  round(ST_X(location)::numeric, 3) as grid_lng,
  round(ST_Y(location)::numeric, 3) as grid_lat,
  count(*) as note_count,
  sum(read_count) as total_reads,
  mode() within group (order by mood_tag) as dominant_mood  -- 主导情绪
from notes 
where archived_at is null 
  and created_at > now() - interval '7 days'
  and (filter_mood is null or mood_tag = filter_mood)
group by grid_lng, grid_lat;
```

**情绪地图模式**：
- happy → 黄色 🔶
- sad → 蓝色 🔷
- angry → 红色 🔴
- anxious → 紫色 🟣
- love → 粉色 🩷
- thought → 绿色 🟢
- rant → 橙色 🟠

### 4.2 内容审核队列（支撑：放下纸条）
```typescript
interface ModerationQueueItem {
  id: string;
  noteId: string;
  content: string;
  locationName: string;
  authorCode: string;           // 匿名代号
  aiScores: Record<string, number>;
  aiFlaggedCategories: string[];
  aiDetectedMood: string;       // AI 识别情绪
  userSelectedMood: string;     // 用户选择情绪（不一致时高亮）
  submittedAt: string;
  status: 'pending' | 'human_approved' | 'human_rejected';
}

// 操作
POST /admin/moderation/:id/approve  // 人工放行
POST /admin/moderation/:id/reject   // 人工确认拦截 + 可选封禁作者

// 快捷操作（键盘快捷键）
// Y → 通过
// N → 拒绝
// S → 标记敏感（升级处理）
// → 下一条
```

### 4.3 话题分析看板（新增，支撑：纸条搜索/筛选）
```typescript
// 热门话题排名
interface TopicRanking {
  topic: string;
  noteCount: number;
  readCount: number;
  replyCount: number;
  dominantMood: string;         // 该话题主导情绪
  trending: 'up' | 'down' | 'stable';  // 趋势
  growthRate: number;           // 24h 增长率
  topLocations: Array<{ name: string; count: number }>;  // 该话题最多的地点
}

// 新兴话题预警（24h 内出现次数突增 > 300%）
interface EmergingTopicAlert {
  topic: string;
  previousCount: number;
  currentCount: number;
  growthRate: number;
  sampleNotes: Array<{ content: string; location: string }>;
}
```

### 4.4 情绪分析看板（新增）
```typescript
// 全站情绪分布
interface MoodDistribution {
  overall: Record<string, number>;  // { happy: 1234, sad: 5678, ... }
  byLocation: Array<{
    locationId: string;
    locationName: string;
    moodDistribution: Record<string, number>;
    dominantMood: string;
  }>;
  byTime: Array<{
    hour: number;                    // 0-23
    moodDistribution: Record<string, number>;
  }>; // 分析情绪的时间规律（如深夜 sad 占比高）
}
```

### 4.5 品牌投放管理
```sql
-- 品牌投放表（扩展 Schema）
create table brand_campaigns (
  id uuid primary key default gen_random_uuid(),
  brand_partner_id uuid references brand_partners(id),
  location_id uuid references locations(id),
  note_id uuid references notes(id),
  budget_cents int not null,
  spent_cents int default 0,
  cpm_cents int default 5000,
  status text default 'active' check (status in ('pending', 'active', 'paused', 'completed')),
  start_at timestamptz,
  end_at timestamptz
);
```

---

## 5. 验收标准

### AC-1: 全景地图
- [ ] 运营人员可在地图上看到全量纸条分布热力图
- [ ] 支持按时间范围、纸条类型筛选
- [ ] **支持情绪地图模式（7 种情绪不同颜色）**
- [ ] 缩放至城市级别时自动聚合为热力图，缩放至街道级别显示单点
- [ ] 点击单点可查看纸条完整内容与统计数据

### AC-2: 内容审核
- [ ] AI 标记为模糊的内容 5min 内进入审核队列
- [ ] 审核人员平均处理时间 < 30s/条（快捷按钮 + 键盘快捷键）
- [ ] 人工审核结果同步更新纸条状态（放行/删除）
- [ ] 审核日志完整记录（谁、何时、什么决定）
- [ ] 审核统计面板显示通过率、拦截率、处理时效

### AC-3: 话题与情绪分析（新增）
- [ ] 热门话题 Top 20 自动更新，显示趋势箭头
- [ ] 新兴话题 24h 内突增 > 300% 时触发预警
- [ ] 全站情绪分布饼图准确反映 7 种情绪占比
- [ ] 情绪时间规律分析（如"深夜 23-02 点 sad 占比最高"）
- [ ] 话题-地点关联矩阵可交互（点击话题看哪些地点最多）

### AC-4: 品牌投放
- [ ] 品牌方可登录专属后台创建投放
- [ ] 投放内容需经运营审核后方可上线
- [ ] 实时展示曝光量、阅读量、消耗金额
- [ ] 预算耗尽自动暂停投放

### AC-5: 数据仪表盘
- [ ] DAU、MAU、日活跃纸条数自动更新
- [ ] 热门地点 Top 20 按日/周/月切换
- [ ] 用户留存（次日、7日、30日）可视化
- [ ] 数据支持 CSV 导出

---

## 6. 产物清单

- [ ] `admin-dashboard/` 独立 React 项目源码
- [ ] `admin-dashboard/src/pages/Dashboard/` 数据总览
- [ ] `admin-dashboard/src/pages/Heatmap/` 热力图可视化（含情绪地图模式）
- [ ] `admin-dashboard/src/pages/Moderation/` 审核队列
- [ ] `admin-dashboard/src/pages/Topics/` **话题分析看板（新增）**
- [ ] `admin-dashboard/src/components/Heatmap/` 热力图组件
- [ ] `admin-dashboard/src/components/MoodChart/` **情绪分布图表组件（新增）**
- [ ] `supabase/migrations/` 品牌相关表 + RBAC 角色迁移
- [ ] `supabase/functions/admin-stats/` 聚合统计 RPC 函数
- [ ] `supabase/functions/admin-moderation/` 审核操作 RPC 函数
- [ ] `docs/SW-05-ADMIN-MANUAL.md` 运营后台使用手册
- [ ] `docs/SW-05-BRAND-ONBOARDING.md` 品牌方入驻流程文档
- [ ] `docs/SW-05-MODERATION-GUIDELINES.md` 人工审核标准指南
