# DeadDrop 真实 API 接入指南

## 当前状态

演示服务器已接入 **真实地图数据**，无需 Key 即可使用：

| 地图源 | 类型 | 需 Key | 说明 |
|--------|------|--------|------|
| GeoQ 智图 | 暗色矢量 | 否 | 国家地理信息公共服务平台，中文标注 |
| 高德标准 | 矢量 | 否 | `autonavi.com` 免费 tile，中文道路 |
| 高德卫星 | 影像 | 否 | 卫星影像 + 道路叠加 |
| OpenStreetMap | 矢量 | 否 | 全球开源地图 |
| **高德官方** | 矢量+路况 | **是** | 矢量渲染+实时路况+POI搜索 |
| **腾讯官方** | 矢量 | **是** | 腾讯 LBS 底图服务 |
| **百度官方** | 矢量 | **是** | 百度 LBS 底图服务 |

---

## 一、前端地图 API Key 申请

### 1. 高德地图（推荐）

申请地址：https://console.amap.com/dev/key/app

```
1. 注册/登录高德开放平台账号
2. 进入「应用管理」→「我的应用」→「创建新应用」
3. 应用类型选择「移动端」或「Web端」
4. 添加 Key，服务平台选择「Web服务」
5. 复制 Key 填入 demo-server/static/index.html 中的 GAODE_KEY
```

填入位置：
```javascript
const GAODE_KEY = '你的高德Key';
```

### 2. 腾讯地图

申请地址：https://lbs.qq.com/dev/console/application/mine

```
1. 注册/登录腾讯位置服务
2. 创建应用，选择「WebService API」
3. 添加 Key，勾选「地图SDK」权限
4. 复制 Key 填入 TENCENT_KEY
```

### 3. 百度地图

申请地址：https://lbsyun.baidu.com/apiconsole/key

```
1. 注册/登录百度地图开放平台
2. 创建应用，选择「浏览器端」
3. 添加 Key，启用「JavaScript API」
4. 复制 Key 填入 BAIDU_KEY
```

---

## 二、后端接入真实 Supabase

当前演示后端是 Flask Mock 数据。要接入真实后端：

### 方式 1：直接修改前端 API 地址

编辑 `mobile-app/src/api/client.ts`：

```typescript
const SUPABASE_URL = 'https://你的项目.supabase.co';
const SUPABASE_ANON_KEY = '你的Anon Key';
```

### 方式 2：部署 Edge Functions 到 Supabase

```bash
# 1. 安装 Supabase CLI
npm install -g supabase

# 2. 登录
supabase login

# 3. 链接项目
supabase link --project-ref 你的项目ID

# 4. 推送数据库迁移
supabase db push

# 5. 部署 Edge Functions
supabase functions deploy notes-nearby
supabase functions deploy notes-heatmap
supabase functions deploy notes-read
supabase functions deploy notes-create
supabase functions deploy replies
```

### 方式 3：将 Flask Demo 代理到真实 Supabase

修改 `demo-server/app.py`，把 Mock 数据替换为真实 API 调用：

```python
import requests

SUPABASE_URL = "https://你的项目.supabase.co"
SUPABASE_ANON_KEY = "你的Anon Key"

def proxy_to_supabase(endpoint, body):
    headers = {
        "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
        "Content-Type": "application/json"
    }
    r = requests.post(f"{SUPABASE_URL}/functions/v1/{endpoint}",
                      headers=headers, json=body)
    return r.json()
```

---

## 三、切换地图源

浏览器中打开 `http://127.0.0.1:5000`，进入地图页后：

1. 点击右上角的「切换地图」按钮
2. 选择想要的地图源：
   - **GeoQ 暗色**（默认）：深色主题，与 App 风格统一
   - **高德标准**：中文道路标注最完整
   - **高德卫星**：卫星影像模式
   - **OpenStreetMap**：全球覆盖
   - **高德官方***：填入 Key 后可用，带实时路况
   - **腾讯官方***：填入 Key 后可用

---

## 四、GPS 定位说明

演示环境支持三级定位：

| 方式 | 触发条件 | 精度 | 状态显示 |
|------|---------|------|---------|
| 浏览器 GPS | 用户允许定位权限 | 5-20米 | 绿色 "GPS定位中" |
| IP 定位 | GPS 被拒绝时自动 fallback | 城市级 | 黄色 "IP定位" |
| 模拟位置 | 以上都不可用时 | - | 黄色 "模拟位置" |

**注意**：浏览器 GPS 在 HTTP（非 HTTPS）环境下可能被拒绝，部署到 HTTPS 后定位精度最高。
