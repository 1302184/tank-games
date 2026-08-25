# 🕹️ Retro Tank Battle: Endless Evolution 
> 经典红白机重构：单文件原生 Web 坦克大战（集成开放世界肉鸽割草模式与双人对抗）

[![HTML5](https://img.shields.io/badge/HTML5-Pure_Native-orange?style=flat-square&logo=html5)]()
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-yellow?style=flat-square&logo=javascript)]()
[![CSS3](https://img.shields.io/badge/CSS3-CRT_Retro-blue?style=flat-square&logo=css3)]()
[![Status](https://img.shields.io/badge/Status-Online_Playable-success?style=flat-square)]()

一个向 FC 经典《坦克大战》致敬的纯前端 Web 游戏实验项目。本项目在**零外部图片、零第三方框架、零 CDN 依赖**的前提下，通过原生 HTML/CSS/JavaScript 实现了硬核复古街机体验，并创新性地融合了现代**开放世界肉鸽（Rogue-lite）构筑割草玩法**。

🔗 **在线游玩地址**：[点击进入在线演示]（https://1302184.github.io/tank-games/) *(请将链接替换为你实际的 GitHub Pages 部署地址)*

---

## ✨ 核心特色功能 (Key Features)

1. **多模式不朽街机矩阵**：
   - **经典闯关 (Classic)**：严守原版红白机规则，保护老鹰基地，歼灭全图敌军。
   - **限时挑战 (Time Attack)**：90 秒高压清场，极限测试火力与走位。
   - **经典无尽 (Endless)**：敌军加速生成，挑战生存极限与历史最高分。
   - **双人同屏 (2-Player)**：支持本地双人协作或硬核友军伤害对抗。
   - **大地图生存 (Rogue-lite 新模式)**：突破画框限制，引入 14 倍超大开放竞技场、摄像机跟随、雷达小地图与动态敌军包围圈。

2. **现代化 Rogue-lite 成长构筑**：
   - **击杀升级系统**：消灭敌军获取经验值，满级触发半透明磨砂三选一进化面板。
   - **无限叠加的构筑（Build）体系**：所有增益技能支持重复选择与效果强化（多管火炮、穿甲高爆、装甲强化、贫铀穿甲弹、火力全开等）。
   - **高容错与重装机甲手感**：大地图模式赋予玩家 500 点高额血容量，搭配车尾动态血条与逆旋转数字 HUD。

3. **硬核纯代码视觉与声效**：
   - **纯 CSS 雕琢美学**：无外部图片，全靠 `linear-gradient` 与 `box-shadow` 动态重塑 8-Bit 像素质感与 CRT 老式电视扫描线滤镜。
   - **Web Audio 芯片级声波合成**：手工调配振荡器（Oscillator），实时程序化演算开场八音盒爬音、引擎轰鸣与沉浸式氛围 BGM。

---

## 🛠️ 技术亮点与架构 (Engineering & Architecture)

* **纯净模块化工程**：摒弃复杂的前端打包工具，采用规范的传统工程结构（Config、Utils、Audio、Game 逻辑分离），在 Windows 环境下开箱即用。
* **防重叠自治 AI（Anti-Overlap System）**：摒弃传统“蜂群式”无脑堆叠，为敌军赋予刚体体积互斥与战术迂回概率，确保敌阵错落有致。
* **高性能内存管理**：实现高效的对象池（DOMPool）架构，针对高频生成的子弹与爆炸粒子进行零内存抖动复用，丝滑稳定 60 帧。
* **即时交互控制**：支持键盘 `P 键` 或**鼠标左键单击任意区域**随时呼出暂停菜单，允许在战局中途免刷新一键切换任意游戏模式。

---

## 📁 项目目录结构 (Project Structure)

```text
tank-game/
│
├── tank.html             # 游戏主入口（原 index.html，支持多语言及外壳挂载）
│
├── css/                  # 样式表现层
│   ├── base.css          # 全局 CSS 变量、复古滤镜、动画关键帧
│   ├── layout.css        # 响应式外框、UI 面板与游戏视口布局
│   └── entities.css      # 游戏实体样式（坦克、地形、血条、升级卡片）
│
└── js/                   # 业务逻辑层
    ├── config.js         # 配置中心（多语言字典、地图矩阵、数值策划表）
    ├── utils.js          # 工具包（DOM 创建、AABB 碰撞检测、对象池）
    ├── audio.js          # Web Audio API 实时声音合成引擎
    ├── game.js           # 核心控制器（游戏循环、状态机、多模式逻辑）
    └── main.js           # 全局启动器（视口自适应、语言初始化）
