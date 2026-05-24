# HW-01 ESP32-S3 物理终端设备 — 开发提示词

## 元信息
- **模块 ID**: HW-01
- **模块名称**: ESP32-S3 物理终端设备（DeadDrop Box）
- **所属域**: Hardware
- **执行阶段**: Phase 3（依赖 HW-02 + HW-03 + HW-05）
- **预估工期**: 2-3 周（含原型迭代）

---

## 1. 模块边界与职责

### 核心职责
设计并组装一台基于 ESP32-S3 的物联网终端设备，部署在实体场所（门店、景区、校园），作为手机 App 的补充入口。用户无需安装 App，直接在设备上"留纸条"或"读纸条"。

### 明确包含
- **硬件选型与 BOM**：ESP32-S3 开发板 + 外设 + 结构件
- **原理图设计**：电源、通信、外设连接
- **PCB 布局**：至少完成面包板验证版 + 可选 PCB 打样
- **外壳结构设计**：3D 打印外壳（防水防尘考虑）
- **设备认证**：每台设备唯一 ID，注册到后端（HW-04）

### 明确不包含
- 固件代码（属于 HW-02）
- 外设驱动（属于 HW-03）
- 电源管理算法（属于 HW-05）

---

## 2. 硬件规格

### 2.1 核心板选型
| 参数 | 规格 |
|------|------|
| SoC | ESP32-S3-WROOM-1-N16R8 |
| CPU | Xtensa LX7 双核 @ 240MHz |
| SRAM | 512KB + 8MB PSRAM（外部）|
| Flash | 16MB |
| Wi-Fi | 802.11 b/g/n，2.4GHz |
| Bluetooth | BLE 5.0 + 经典蓝牙 |
| 工作电压 | 3.3V（USB 5V 输入经 LDO）|

### 2.2 外设清单
| 外设 | 型号建议 | 用途 |
|------|----------|------|
| 显示屏 | 2.8" 或 3.5" SPI TFT LCD (ILI9341 / ST7789)，带触摸 | 主交互界面 |
| 触摸 | 电容触摸屏（FT6236 / XPT2046）| 点击、滑动 |
| GPS 模块 | ATGM336H / NEO-6M | 设备精确定位 |
| 音频 | INMP441 I2S 麦克风 + MAX98357 I2S 功放 + 8Ω 0.5W 喇叭 | 语音纸条录播 |
| 按键 | 2× 机械按键（留/读模式切换 + 确认）| 物理快捷操作 |
| LED | WS2812B RGB × 3（状态指示）| 设备状态反馈 |
| 蜂鸣器 | 有源蜂鸣器 | 操作确认音 |
| 电源 | 18650 锂电池 × 2 + TP4056 充电模块 + MT3608 升压 | 离线供电 |
| 太阳能（户外）| 5V 太阳能板 + CN3065 充电管理 | 户外持续供电 |

### 2.3 硬件框图
```
┌──────────────────────────────────────────┐
│           ESP32-S3-WROOM-1               │
│                                          │
│  GPIO18 ──→ SPI CLK ─────────────┐       │
│  GPIO19 ──→ SPI MISO ────────────┼──→ TFT LCD + Touch (SPI)
│  GPIO23 ──→ SPI MOSI ────────────┘       │
│  GPIO5  ──→ TFT CS                       │
│  GPIO4  ──→ TFT DC/RS                    │
│  GPIO16 ──→ Touch CS                     │
│                                          │
│  GPIO34 ──→ I2S BCLK ────────────┐       │
│  GPIO35 ──→ I2S LRCK ────────────┼──→ Audio Codec (MAX98357 + INMP441)
│  GPIO8  ──→ I2S DIN ─────────────┘       │
│  GPIO9  ──→ I2S DOUT                     │
│                                          │
│  GPIO20 ──→ UART TX ─────────────→ GPS   │
│  GPIO21 ──→ UART RX ←────────────  (ATGM336H)
│                                          │
│  GPIO10 ──→ WS2812B Data ────────→ LEDs  │
│  GPIO11 ──→ Buzzer PWM ──────────→ 蜂鸣器 │
│  GPIO12 ──→ Key A (Mode)                 │
│  GPIO13 ──→ Key B (Confirm)              │
│                                          │
│  5V USB ──→ TP4056 ──→ 18650 ×2 ──→ MT3608 ──→ 5V 稳压 ──→ ESP32 + 外设
└──────────────────────────────────────────┘
```

---

## 3. 结构设计

### 3.1 外形尺寸
- **目标尺寸**: 150mm × 100mm × 40mm（手持式 / 壁挂式）
- **安装方式**: 桌面支架 + 壁挂孔（兼容两种场景）

### 3.2 外壳设计要点
| 特性 | 方案 |
|------|------|
| 材料 | PLA / PETG 3D 打印（原型）；注塑 ABS（量产）|
| 屏幕开口 | 居中，四周 1mm 间隙防触边 |
| 按键开口 | 顶部或侧面，防水硅胶垫覆盖 |
| 扬声器孔 | 底部格栅，防尘网覆盖 |
| 充电口 | Type-C，带橡胶塞 |
| 散热 | 外壳开散热槽，ESP32 贴散热垫 |
| 防盗 | 背部防盗锁孔 + 可选内置蜂鸣器报警 |

### 3.3 原型迭代计划
```
V0.1 面包板验证（2 天）
  └── ESP32-S3 + LCD + 一个按键，验证基本通信

V0.2 外设集成（3 天）
  └── 加入触摸、GPS、音频、LED、蜂鸣器

V0.3 电源系统（2 天）
  └── 18650 + 充电模块 + 功耗测试

V0.4 外壳设计（3 天）
  └── Fusion 360 建模 → 3D 打印 → 装配验证

V1.0 功能样机（5 天）
  └── 完整组装 + 固件联调 + 72h 稳定性测试
```

---

## 4. 与软件域的交互接口

```
设备启动
    ├──→ WiFi 连接（预配网络或 BLE 配网）
    ├──→ HTTPS POST /api/devices/register
    │       Body: { deviceId: "DEADBOX-{MAC}", hardwareVersion: "1.0", firmwareVersion: "1.0.0" }
    │       Response: { authToken: "...", locationId?: "..." }
    │
    └──→ 后续所有请求携带 Authorization: Bearer {authToken}

心跳上报（每 5 分钟）
    POST /api/devices/heartbeat
    Body: { deviceId, batteryPercent, status, gps: {lat, lng} }

读取纸条
    GET /api/notes/nearby?lat={gps_lat}&lng={gps_lng}&radius=50
    （与 SW-01 调用同一接口）

发布纸条
    POST /api/notes
    Body: { content, lat, lng, lifespanType, deviceId }
```

---

## 5. 验收标准

### AC-1: 硬件功能
- [ ] 所有外设（屏、触摸、GPS、音频、LED、按键）在 ESP32-S3 上正常驱动
- [ ] 设备可独立连接 WiFi 并与 SW-02 后端通信
- [ ] GPS 定位精度 < 10m（室外开阔地带）
- [ ] 语音录制清晰（采样率 16kHz，信噪比 > 40dB）
- [ ] 语音播放音量 > 70dB @ 10cm

### AC-2: 结构与可靠性
- [ ] 外壳装配紧密，无松动异响
- [ ] 设备从 50cm 高度跌落不影响功能
- [ ] 连续运行 72h 无重启、死机
- [ ] 工作温度范围 0°C ~ 45°C

### AC-3: 电源
- [ ] 满电电池支持连续工作 > 8h
- [ ] 待机功耗 < 50mA（屏幕休眠 + WiFi 保持）
- [ ] 充电时正常工作，不发烫（< 50°C）

### AC-4: 集成
- [ ] 设备可通过 SW-05 运营后台注册与监控
- [ ] OTA 升级成功（HW-04）

---

## 6. 产物清单

- [ ] `hardware/v1/bom.xlsx` 完整物料清单与采购链接
- [ ] `hardware/v1/schematic.pdf` 电路原理图
- [ ] `hardware/v1/pcb/` PCB 设计文件（KiCad / EasyEDA）
- [ ] `hardware/v1/case/` 外壳 3D 模型（.step + .stl）
- [ ] `hardware/v1/assembly-guide.md` 组装指南（图文）
- [ ] `docs/HW-01-DATASHEET.md` 设备规格书
