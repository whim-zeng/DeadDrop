# SW-03 AI 服务层 — 开发提示词（优化版）

## 元信息
- **模块 ID**: SW-03
- **模块名称**: AI 服务层（内容审核 + 地点 AGENT + 智能标签）
- **所属域**: Software
- **执行阶段**: Phase 2（依赖 SW-02 Schema 就绪）
- **预估工期**: 2-3 周
- **版本**: v2（基于功能模块表优化，补充情绪/话题标签自动提取）

---

## 1. 模块边界与职责

### 核心职责
为 DeadDrop 提供三重 AI 能力：**内容安全审核**、**地点 AGENT 生成**、**智能标签提取**（情绪/话题自动识别）。

### 按八大功能模块的支撑关系

| 功能模块 | AI 支撑 |
|----------|---------|
| 用户注册/匿名身份系统 | — |
| 地图与热力图浏览 | AGENT 角色图标生成 |
| 附近纸条列表/预览 | — |
| 纸条搜索/筛选 | **情绪标签识别** + **话题标签提取** |
| 位置验证 | — |
| 放下纸条（内容创作）| **内容安全审核** + **自动标签提取** |
| 捡起纸条（内容消费）| — |
| 匿名回复/对话链 | **回复内容审核** |

### 明确包含
- **内容审核管道**：OpenAI Moderation API + 自定义规则双层过滤
- **智能标签提取**：自动识别纸条情绪的 7 种标签 + 提取 1-3 个话题标签
- **地点 AGENT 自动生成**：基于某地点历史纸条聚类分析，生成"土地公公"角色设定
- **对话系统**：用户与地点 AGENT 的 RAG（检索增强生成）聊天
- **向量存储**：地点纸条 Embedding + 向量检索（Supabase pgvector）
- **审核人工复核队列**：被拦截内容的申诉与人工审核工作流

### 明确不包含
- 前端聊天 UI（属于 SW-01）
- 数据库主表设计（属于 SW-02，但需扩展字段）
- 运营后台的审核界面（属于 SW-05）

---

## 2. 技术栈与约束

| 层级 | 选型 | 理由 |
|------|------|------|
| 大模型 | OpenAI GPT-4o-mini（对话+标签）+ GPT-4o（AGENT 生成）| 性价比平衡 |
| 审核 API | OpenAI Moderation API v1 | 免费、覆盖多语言、含多类别 |
| Embedding | text-embedding-3-small | 1536 维，成本极低 |
| 向量数据库 | Supabase pgvector | 与主数据库同实例，延迟低 |
| 框架 | LangChain / 自研轻量 RAG 框架 | 灵活控制 RAG 流程 |
| 缓存 | Upstash Redis / Supabase 内存表 | AGENT 角色设定缓存 |

### 非功能约束
- **审核延迟**: 单条内容审核 P95 < 500ms
- **标签提取延迟**: 单条 P95 < 800ms
- **对话延迟**: RAG 生成首字 P95 < 2s
- **成本上限**: 每千次对话 < $0.05；每千次标签提取 < $0.01
- **隐私**: 不将用户身份信息传入 LLM；仅传入纸条内容 + 匿名 ID

---

## 3. 子系统架构

```
┌─────────────────────────────────────────────────────────────────┐
│                    SW-03 AI 服务层                               │
├─────────────────────┬─────────────────────┬─────────────────────┤
│   内容审核子系统      │   智能标签子系统      │   地点 AGENT 子系统  │
├─────────────────────┼─────────────────────┼─────────────────────┤
│ Moderation API      │ 情绪分类（7类）       │ 纸条聚类分析         │
│ 自定义规则引擎       │ 话题提取（1-3个）     │ → 角色设定生成       │
│ 人工复核队列         │ 自动补全标签          │                     │
│                     │                     │ 用户提问             │
│                     │                     │ → 向量检索相似纸条    │
│                     │                     │ → RAG Prompt 组装    │
│                     │                     │ → GPT-4o-mini 回复   │
└─────────────────────┴─────────────────────┴─────────────────────┘
```

---

## 4. 内容审核子系统

### 4.1 审核流程
```
用户发布纸条 / 回复
    │
    ├──→ OpenAI Moderation API ──→ 分数阈值判断
    │                              ├── 通过 → 进入标签提取 → 发布
    │                              ├── 模糊（0.3~0.7）→ 人工复核队列
    │                              └── 拦截（>0.7）→ 拒绝发布 + 用户提示
    │
    └──→ 自定义规则引擎（第二层）
           ├── 敏感地点保护（医院、学校等禁止营销内容）
           ├── 重复内容检测（相似度 >90% 视为刷屏）
           ├── 联系方式过滤（手机号、微信号、URL 模式匹配）
           └── 情绪标签一致性校验（用户选的情绪与 AI 识别偏差大时提示）
```

### 4.2 Moderation 类别映射
| 类别 | 阈值 | 动作 |
|------|------|------|
| harassment | 0.6 | 模糊/拦截 |
| hate | 0.5 | 直接拦截 |
| sexual | 0.7 | 模糊（医疗/健康场景可能误判）|
| violence | 0.6 | 直接拦截 |
| self-harm | 0.3 | 直接拦截 + 触发危机干预提示 |
| spam | 0.8 | 模糊 |

### 4.3 API 设计
```typescript
// POST /functions/v1/moderate
interface ModerateRequest {
  content: string;
  noteId?: string;           // 关联纸条
  locationType?: string;      // 用于地点特殊规则
  userSelectedMood?: string;  // 用户选的情绪标签（一致性校验）
}

interface ModerateResponse {
  status: 'approved' | 'flagged' | 'rejected';
  scores: Record<string, number>;     // 各类别原始分数
  matchedRules: string[];             // 触发的自定义规则
  aiDetectedMood?: string;            // AI 识别的情绪（与用户选择对比）
  moodMismatch?: boolean;             // 是否情绪不一致
  message?: string;                   // 拒绝时给用户的提示
}
```

---

## 5. 智能标签子系统（新增）

### 5.1 情绪标签识别
将纸条内容自动分类为 7 种情绪：

| 标签值 | 表情 | 描述 |
|--------|------|------|
| `happy` | 😊 | 开心、快乐、满足、庆祝 |
| `sad` | 😢 | 难过、失落、遗憾、离别 |
| `angry` | 😠 | 愤怒、不满、吐槽、抱怨 |
| `anxious` | 😰 | 焦虑、紧张、担忧、压力 |
| `love` | 💕 | 告白、喜欢、爱意、温暖 |
| `thought` | 🤔 | 感悟、思考、哲理、随笔 |
| `rant` | 😂 | 吐槽、搞笑、荒诞、轻松 |

**实现方式**:
```typescript
// 调用 GPT-4o-mini 进行分类
async function detectMood(content: string): Promise<string> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `你是一个情绪分类专家。将用户输入的纸条内容分类为以下7种情绪之一：
        happy(开心)、sad(难过)、angry(愤怒)、anxious(焦虑)、love(告白)、thought(感悟)、rant(吐槽)。
        只返回标签值，不要解释。如果内容混合多种情绪，选择最主导的一种。`
      },
      { role: 'user', content }
    ],
    temperature: 0.2,
    max_tokens: 10
  });
  return response.choices[0].message.content.trim();
}
```

### 5.2 话题标签提取
自动从纸条内容提取 1-3 个话题标签：

```typescript
async function extractTopics(content: string, locationType?: string): Promise<string[]> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `从纸条内容中提取 1-3 个话题标签。要求：
        - 标签简短（2-6 字）
        - 标签要有搜索价值（"失恋"、"考研"、"美食推荐"）
        - 不要提取过于宽泛的标签（"生活"、"感受"）
        - 返回 JSON 数组格式：["标签1", "标签2"]`
      },
      { role: 'user', content: `地点类型：${locationType || '通用'}\n纸条内容：${content}` }
    ],
    temperature: 0.3,
    max_tokens: 50,
    response_format: { type: 'json_object' }
  });
  const result = JSON.parse(response.choices[0].message.content);
  return result.topics?.slice(0, 3) || [];
}
```

### 5.3 标签一致性校验
用户发布时选择情绪标签，AI 自动识别后进行对比：
- 若一致：直接通过
- 若偏差大（如用户选 happy，AI 识别 sad）：弹出提示"你看起来有些难过，确定选择'开心'吗？"
- 用户可坚持原选择（尊重用户表达意图）

### 5.4 标签使用场景
- **筛选功能**：用户按情绪/话题筛选附近纸条
- **热力图模式**："只看告白"地图模式下，仅显示 love 标签的纸条密度
- **AGENT 对话**：AGENT 了解地点情绪分布，调整对话口吻

---

## 6. 地点 AGENT 子系统

### 6.1 角色生成流程
```typescript
// 触发条件：某地点 notes 数量 >= 10 条，或每周定时扫描
async function generateLocationAgent(locationId: string) {
  // 1. 获取该地点最近 100 条纸条
  const notes = await getRecentNotes(locationId, 100);
  
  // 2. 情绪分布分析
  const moodDistribution = analyzeMoodDistribution(notes);
  // 输出：{ happy: 12, sad: 35, love: 8, ... }
  
  // 3. 话题聚类
  const topicClusters = await clusterTopics(notes);
  // 输出：{ topic: '失恋告白', count: 23, sentiment: 'sad' }, ...
  
  // 4. 生成角色设定（调用 GPT-4o）
  const agentConfig = await llmGenerate({
    system: `你是一个地点灵魂生成器。根据以下地点的纸条内容分析，生成一个"土地公公"式的角色设定。
    要求：
    - 角色名要有地点特色（如"食堂守护者"、"湖畔老人"）
    - 性格要贴合此地情感基调（如失恋高发地 → 温柔治愈系）
    - 知识背景基于纸条中的话题
    - 口吻温暖、略带幽默、有故事感
    - 回复时经常引用历史纸条中的故事（匿名化处理）`,
    user: `地点：${location.name}\n情绪分布：${JSON.stringify(moodDistribution)}\n话题聚类：${JSON.stringify(topicClusters)}`
  });
  
  // 5. 存入 locations.agent_config JSONB
  await saveAgentConfig(locationId, agentConfig);
  
  // 6. 为该地点所有纸条生成 Embedding，存入向量表
  await indexLocationNotes(locationId);
}
```

### 6.2 角色设定 JSON Schema
```json
{
  "agentName": "湖畔守望者",
  "title": "这片湖记得所有秘密",
  "personality": ["温柔", "略带忧伤", "善于倾听", "爱讲故事"],
  "speakingStyle": "用拟人化的自然口吻，常以'我在这里很久了...'开头",
  "knowledgeAreas": ["校园爱情", "考试焦虑", "毕业离别"],
  "moodBaseline": "sad",
  "forbiddenTopics": ["个人隐私追问", "现实联系方式交换"],
  "signaturePhrases": ["湖水记得每一滴眼泪", "风会带来新的故事"],
  "avatarPrompt": "一位坐在湖边长椅上的发光老人，背景是星空湖面，风格：水彩插画"
}
```

### 6.3 RAG 对话流程
```typescript
// POST /functions/v1/agents/:locationId/chat
async function chatWithAgent(locationId: string, userMessage: string, sessionId?: string) {
  // 1. 获取地点 AGENT 配置
  const agent = await getAgentConfig(locationId);
  
  // 2. 用户问题 Embedding
  const queryEmbedding = await openai.embeddings.create({
    input: userMessage,
    model: 'text-embedding-3-small'
  });
  
  // 3. 向量检索（余弦相似度 Top-5）
  const relevantNotes = await supabase.rpc('match_notes', {
    query_embedding: queryEmbedding.data[0].embedding,
    match_location_id: locationId,
    match_threshold: 0.7,
    match_count: 5
  });
  
  // 4. 组装 RAG Prompt（融入情绪基调和话题）
  const systemPrompt = buildAgentSystemPrompt(agent);
  const context = relevantNotes.map(n => `[纸条片段] ${n.content.substring(0, 200)}...`).join('\n');
  
  // 5. LLM 生成
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `以下是与用户问题相关的历史纸条片段：\n${context}\n\n用户问题：${userMessage}` }
    ],
    temperature: 0.8,
    max_tokens: 500
  });
  
  // 6. 保存对话历史
  await saveChatMessage(sessionId, userMessage, response.choices[0].message.content, relevantNotes.map(n => n.id));
  
  return {
    reply: response.choices[0].message.content,
    sessionId,
    sources: relevantNotes.map(n => ({ noteId: n.id, snippet: n.content.substring(0, 100) }))
  };
}
```

---

## 7. 向量检索 SQL 函数

```sql
-- 在 Supabase 中创建
enable extension vector;

create table note_embeddings (
  id uuid primary key default gen_random_uuid(),
  note_id uuid references notes(id) on delete cascade,
  location_id uuid references locations(id),
  embedding vector(1536),
  content_snippet text,        -- 前 300 字
  mood_tag text,               -- 缓存情绪标签（用于筛选）
  topic_tags text[],           -- 缓存话题标签
  created_at timestamptz default now()
);

create index on note_embeddings using ivfflat (embedding vector_cosine_ops);
create index on note_embeddings (location_id, mood_tag);

-- 匹配函数（支持情绪筛选）
create or replace function match_notes(
  query_embedding vector(1536),
  match_location_id uuid,
  match_threshold float,
  match_count int,
  filter_mood text default null
)
returns table(id uuid, content text, similarity float) as $$
begin
  return query
  select ne.note_id, ne.content_snippet, 1 - (ne.embedding <=> query_embedding) as similarity
  from note_embeddings ne
  where ne.location_id = match_location_id
    and 1 - (ne.embedding <=> query_embedding) > match_threshold
    and (filter_mood is null or ne.mood_tag = filter_mood)
  order by ne.embedding <=> query_embedding
  limit match_count;
end;
$$ language plpgsql;
```

---

## 8. 验收标准

### AC-1: 内容审核
- [ ] 正常内容（吐槽、感悟、告白）100% 通过
- [ ] 明显违规内容（仇恨、暴力、色情）100% 拦截
- [ ] 模糊内容进入人工复核队列，不误杀合法表达
- [ ] 审核结果在 500ms 内返回
- [ ] 被拦截用户收到明确、友善的提示（非冷冰冰的"违规"）

### AC-2: 智能标签提取（新增）
- [ ] 情绪标签识别准确率 > 85%（人工抽样 100 条评估）
- [ ] 话题标签提取 relevance > 80%（标签与内容相关）
- [ ] 标签提取延迟 P95 < 800ms
- [ ] 用户选择情绪与 AI 识别偏差大时，友好提示但不强制修改
- [ ] 标签支持多语言（中文为主）

### AC-3: 地点 AGENT 生成
- [ ] 有 >=10 条纸条的地点，自动生成 AGENT 角色设定
- [ ] 角色名和性格贴合地点情绪分布（非随机生成）
- [ ] 生成过程消耗 < $0.01 / 地点
- [ ] AGENT 配置持久化到数据库，可人工编辑

### AC-4: RAG 对话
- [ ] 用户提问后，AGENT 回复引用至少 1 条相关历史纸条
- [ ] 无关问题（如"今天天气"）AGENT 礼貌拒绝，不编造
- [ ] 对话首字延迟 < 2s（在 4G 网络下）
- [ ] 连续对话保持上下文连贯（session 历史保留）

### AC-5: 向量检索
- [ ] 语义相似检索准确率 > 80%（人工抽样评估）
- [ ] Top-5 检索延迟 < 200ms
- [ ] 支持按情绪标签筛选检索结果
- [ ] 纸条删除后对应 Embedding 同步清理

---

## 9. 产物清单

- [ ] `supabase/migrations/` pgvector 扩展 + 向量表迁移
- [ ] `supabase/functions/moderate/` 审核 Edge Function
- [ ] `supabase/functions/agent-chat/` AGENT 对话 Edge Function
- [ ] `supabase/functions/generate-agent/` 角色生成 Edge Function
- [ ] `supabase/functions/extract-tags/` **智能标签提取 Edge Function（新增）**
- [ ] `src/prompts/` 所有 System Prompt 模板（版本化管理）
  - `mood-classification.txt`
  - `topic-extraction.txt`
  - `agent-character-generation.txt`
  - `agent-chat-rag.txt`
- [ ] `docs/SW-03-MODERATION-RULES.md` 审核规则文档
- [ ] `docs/SW-03-TAG-EXTRACTION.md` 标签提取规范与准确率报告
- [ ] `docs/SW-03-AGENT-PROMPT-ENGINEERING.md` Prompt 调优记录
- [ ] `tests/moderation-benchmark.json` 审核测试集（含正负样本）
- [ ] `tests/tag-extraction-benchmark.json` 标签提取测试集
