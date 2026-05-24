# DeadDrop 项目开发指南

> 最后更新：2026-05-22  
> 当前阶段：Phase 1 后端完成 + Phase 2 前端框架完成 + 演示服务器运行中

---

## 一、项目概述

**DeadDrop** 是一个基于地理位置的匿名社交应用。用户可以在真实世界的某个地点"放下"一张纸条（文字或语音），只有 physically 走到该地点 50 米范围内的其他人才能阅读全文。核心体验围绕**空间距离**展开：

- **50 米内**：完整阅读，可回复
- **50-200 米**：仅看 30 字摘要
- **200 米外**：仅知道"前方有 X 张纸条"

---

## 二、技术栈

| 层级 | 技术选型 | 状态 |
|------|---------|------|
| **数据库** | PostgreSQL 15 + PostGIS 3.4 | 迁移文件已完成 |
| **BaaS / 后端** | Supabase (Edge Functions + Auth + Realtime) | 5 个 Edge Functions 已开发 |
| **前端 (Mobile)** | React Native + Expo SDK 50 | 完整源码已开发 |
| **演示服务器** | Flask (Python) + Leaflet | 运行中 |
| **地图** | Leaflet + 高德地图 / GeoQ / OSM | 已接入真实地图 |
| **定位** | 浏览器 GPS / IP 定位 / 模拟定位 | 三级 fallback |

---

## 三、项目结构

```
E:\bohack\DeadDrop\prompts\software\
│
├── guide.md                              # 本文件
│
├── supabase/                             # SW-02 后端核心
│   ├── migrations/
│   │   └── 001_initial_schema.sql        # 完整数据库迁移
│   └── functions/
│       ├── notes-nearby/                 # 附近纸条距离分层查询
│       ├── notes-heatmap/                # 热力图网格聚合
│       ├── notes-read/                   # 阅读纸条（位置验证）
│       ├── notes-create/                 # 发布纸条
│       └── replies/                      # 匿名回复
│
├── docs/                                 # 技术文档
│   ├── SW-02-API-SPEC.yaml              # OpenAPI 3.0 规范
│   ├── SW-02-DATABASE-DIAGRAM.md        # ER 图与字段说明
│   └── SW-02-SECURITY-AUDIT.md          # RLS 安全审计
│
├── seed.sql                              # 开发环境测试数据
│
├── mobile-app/                           # SW-01 前端 (React Native)
│   ├── App.tsx
│   ├── package.json
│   ├── src/
│   │   ├── api/                          # Supabase 客户端 + API 封装
│   │   ├── components/                   # NoteCard, VoicePlayer, ReplyThread...
│   │   ├── screens/                      # 页面（Explore / Create / Chat / Profile）
│   │   ├── hooks/                        # useLocation, useNearbyNotes...
│   │   ├── stores/                       # Zustand 状态管理
│   │   ├── navigation/                   # RootNavigator + AppNavigator
│   │   └── utils/                        # 距离计算 / 时间格式化 / 身份生成
│   └── docs/SW-01-API-INTEGRATION.md
│
├── demo-server/                          # 演示服务器
│   ├── app.py                            # Flask 模拟后端
│   ├── static/index.html                 # Web 预览前端（Leaflet 地图）
│   └── API-CONFIG.md                     # 真实 API 接入指南
│
└── nodejs/                               # 本地 Node.js 运行时
    ├── node.exe
    └── npm.cmd
```

---

## 四、当前进展

### 4.1 后端（SW-02）— 已完成

- [x] 数据库 Schema（5 张核心表 + 索引 + 触发器）
- [x] RLS 行级安全策略
- [x] pg_cron 定时任务（归档、清理、热度更新）
- [x] 5 个 Edge Functions（nearby / heatmap / read / create / replies）
- [x] OpenAPI 3.0 规范文档
- [x] 安全审计报告
- [x] 种子数据（含 1000+ 条模拟数据）

### 4.2 前端（SW-01）— 已完成

- [x] React Native + Expo 项目框架
- [x] 匿名身份系统（随机代号 + 渐变色头像）
- [x] 地图与热力图（react-native-maps）
- [x] 距离分层展示（解锁/预览/远处）
- [x] 纸条发布（文字 + 语音 + 情绪标签）
- [x] 阅读与回复（嵌套对话链）
- [x] Zustand 状态管理 + TanStack Query

### 4.3 演示服务器 — 运行中

- [x] Flask Mock 后端（模拟全部 API）
- [x] Web 预览前端（纯 HTML/JS，浏览器即可体验）
- [x] **真实地图接入**（高德 / GeoQ / OSM）
- [x] **真实 GPS 定位**（浏览器 GPS + IP fallback + 模拟）
- [x] **高德逆地理编码**（使用真实 Key 解析地址）
- [x] 实时位置模拟（测试距离变化）

---

## 五、如何运行

### 5.1 方式一：Web 演示（推荐，无需环境）

当前演示服务器已运行：

```
http://127.0.0.1:5000
```

浏览器打开即可体验完整流程：
1. 创建匿名身份
2. 查看地图上的纸条分布
3. 走近解锁阅读
4. 发布自己的纸条

**如果服务器未运行，手动启动：**

```powershell
cd E:\bohack\DeadDrop\prompts\software\demo-server
python app.py
```

### 5.2 方式二：React Native 开发（需 Android Studio / Xcode）

```powershell
# 1. 添加 Node.js 到 PATH
$env:PATH = "E:\bohack\DeadDrop\prompts\software\nodejs;$env:PATH"

# 2. 进入前端项目
cd E:\bohack\DeadDrop\prompts\software\mobile-app

# 3. 安装依赖（已安装过则跳过）
npm install
npx expo install react-native-web react-dom @expo/metro-runtime
npm install babel-plugin-module-resolver

# 4. 启动 Expo
npx expo start

# 5. 按 a 打开 Android 模拟器
#    按 i 打开 iOS 模拟器（仅限 Mac）
#    扫描 QR 码在真机 Expo Go 中预览
```

### 5.3 方式三：部署真实 Supabase 后端

```bash
# 1. 安装 Supabase CLI
npm install -g supabase

# 2. 登录并链接项目
supabase login
supabase link --project-ref 你的项目ID

# 3. 推送数据库迁移
supabase db push

# 4. 部署 Edge Functions
supabase functions deploy notes-nearby
supabase functions deploy notes-heatmap
supabase functions deploy notes-read
supabase functions deploy notes-create
supabase functions deploy replies
```

---

## 六、API 接口速查

| 端点 | 方法 | 功能 |
|------|------|------|
| `/functions/v1/notes-nearby` | POST | 附近纸条（距离分层） |
| `/functions/v1/notes-heatmap` | POST | 热力图聚合 |
| `/functions/v1/notes-read/:id` | POST | 阅读纸条（位置验证） |
| `/functions/v1/notes-create` | POST | 发布纸条 |
| `/functions/v1/replies/:noteId` | GET/POST | 获取/创建回复 |

完整规范见：`docs/SW-02-API-SPEC.yaml`

---

## 七、地图配置

当前演示服务器已接入以下真实地图源：

| 地图源 | 需 Key | 默认 | 说明 |
|--------|--------|------|------|
| 高德标准 | 否 | **是** | 中文道路标注完整 |
| 高德卫星 | 否 | 否 | 卫星影像 |
| GeoQ 暗色 | 否 | 否 | 国家地理信息平台 |
| OpenStreetMap | 否 | 否 | 全球开源地图 |
| 高德官方 | **已填** | 否 | 含实时路况 |

**高德 Key** 已配置：`6404e465242f02ca0d7a140a54bcef3b`

如需切换腾讯/百度地图，申请 Key 后填入 `demo-server/static/index.html` 中的对应变量。

申请地址：
- 高德：https://console.amap.com/dev/key/app
- 腾讯：https://lbs.qq.com/dev/console/application/mine
- 百度：https://lbsyun.baidu.com/apiconsole/key

---

## 八、待办事项（下一步）

### 高优先级
- [ ] 接入 SW-03 AI 服务（内容审核 + 话题提取）
- [ ] 接入 SW-04 实时通信（Supabase Realtime + Presence）
- [ ] 语音录制/播放组件在真机上测试
- [ ] 发布纸条时上传语音到 Supabase Storage

### 中优先级
- [ ] 热力图情绪筛选（"只看告白"模式）
- [ ] 纸条搜索/筛选界面完善
- [ ] 推送通知（Expo Notifications）
- [ ] Mock 位置检测强化

### 低优先级
- [ ] 运营后台（SW-05）
- [ ] 数据导出/迁移工具
- [ ] 性能压测（100万条数据 GiST 索引）

---

## 九、常见问题

### Q: 地图空白怎么办？
A: 检查网络是否可访问 `*.is.autonavi.com`。如不可用，点击右上角「切换地图」选择 OpenStreetMap。

### Q: GPS 定位失败？
A: HTTP（非 HTTPS）环境下浏览器可能拒绝 GPS。演示服务器支持三级 fallback：浏览器 GPS → IP 定位 → 模拟位置。

### Q: Expo Web 构建失败？
A: React Native Web 在 Windows 环境下有兼容性问题。建议使用 Android 模拟器或真机预览。

### Q: 如何修改模拟位置？
A: 编辑 `demo-server/static/index.html` 中的 `state.location` 初始值，或开启「模拟行走」模式。

---

## 十、相关文档

- `SW-01-Mobile-App.md` — 前端需求规格
- `SW-02-Backend-Space.md` — 后端需求规格
- `SW-03-AI-Service.md` — AI 服务需求
- `SW-04-Realtime-Social.md` — 实时通信需求
- `SW-05-Operations-Dashboard.md` — 运营后台需求
- `docs/SW-02-API-SPEC.yaml` — OpenAPI 规范
- `docs/SW-02-DATABASE-DIAGRAM.md` — 数据库设计
- `docs/SW-02-SECURITY-AUDIT.md` — 安全审计
- `demo-server/API-CONFIG.md` — 真实 API 接入配置
