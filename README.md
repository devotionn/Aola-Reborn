# Aola-Reborn

一个面向 PC 浏览器的原创怀旧宠物收集 RPG 原型。目标是复现 2010 年代网页宠物养成游戏的探索、收集、回合战斗和长期养成节奏，同时使用原创名称、原创数据、原创世界观以及后续自有美术/音频资产。

> `Aola` 目前仅作为开发仓库代号。公开发行或商业化版本应更换为原创品牌名，并完成名称、美术、音乐、角色、地图、剧情与商标审查。

## 当前分支定位

你现在看到的是主开发分支：

```text
agent/bootstrap-playable-mvp
```

仓库目前只有两个分支：

| 分支 | 用途 |
| --- | --- |
| `main` | 项目门户 / 稳定基线，目前不代表最新可玩代码 |
| `agent/bootstrap-playable-mvp` | 当前实际可玩开发版本，持续由 Draft PR #1 汇总 |

相关入口：

- `main`：<https://github.com/devotionn/Aola-Reborn>
- 当前开发分支：<https://github.com/devotionn/Aola-Reborn/tree/agent/bootstrap-playable-mvp>
- Draft PR #1：<https://github.com/devotionn/Aola-Reborn/pull/1>

当前开发基线：**v0.8 mist investigation & battle items**。

最新 v0.8 README 基线 commit：`5dffd687`。GitHub Actions run #164 已完成并通过：

```text
Install ✅
Typecheck ✅
Vitest / Production Build ✅
```

## 当前里程碑：v0.8

当前已经形成一条可持续扩展的单机 RPG 纵切：

```text
选择初始星灵
  ↓
星港主城
  ↓
星落原野 · 第一调查
  ↓
烬苔林地 · 第二调查
  ↓
雾镜湿地 · 第三调查
  ↓
随机遭遇 / 捕捉 / 编队 / 仓库 / 图鉴
  ↓
升级 / 成长 / 等级学技能 / 四技能替换
  ↓
背包补给 / PP 管理 / 异常状态 / 换宠
  ↓
战斗物品 / 特殊挑战 / 调查奖励 / 经济循环
```

## 当前内容

### 世界与任务

- 1 个主城：**星港**
- 3 个基于同一 Tiled Object Layer 协议的探索区：
  - **星落原野**
  - **烬苔林地**
  - **雾镜湿地**
- 统一地图对象层：`Barriers` / `EncounterZones` / `Points`
- 实体碰撞、区域遭遇池、命名 NPC / 任务点、双向传送
- 3 条持久化调查任务：
  - 研究员 · 岚音 → 曜角鹿
  - 巡林员 · 柏舟 → 共鸣岩壳龟
  - 观测员 · 汐遥 → 镜雾鹭
- 任务进度通过 LocalStorage flags 保存，退出后不会丢失
- v0.7 已经调查过雾镜信标的旧存档会被 v0.8 正确识别，不要求重复前置步骤

### 星灵与养成

- **15 种原创星灵形态**
- 6 种属性：火 / 水 / 木 / 电 / 岩 / 星
- **22 个技能配置**
- 每只星灵持久化自己的四技能栏与各技能 PP
- 等级学习表 `learnset`
- 四技能已满时，新技能进入待学习队列，不会静默覆盖
- 独立技能学习界面，玩家自己选择遗忘哪一招
- 当前主要成长链：
  - 炽尾团子 Lv.10 → 曜焰灵
  - 澜鳍兽 Lv.10 → 沧澜兽
  - 森芽狸 Lv.10 → 森冠狸
  - 苔灯蛾 Lv.14 → 森灯羽
  - 晶露蜗 Lv.14 → 月晶螺
- 当前首批等级学习技能包括：
  - 曜焰灵 Lv.12 → 星焰扑击
  - 沧澜兽 Lv.12 → 深澜回流
  - 森冠狸 Lv.12 → 森冠棘环
  - 晶露蜗 Lv.11 → 月潮

### 战斗

- 4 技能回合制战斗
- HP、速度先后手、命中率、属性倍率
- PP 消耗与 PP 持久化
- 玩家 / NPC 全 PP 耗尽时使用 **余辉震荡**保底，避免战斗死锁
- 当前异常状态：
  - **灼热**：回合末持续失去 HP
  - **迟缓**：降低有效速度
- 队伍内换宠
- 当前星灵倒下后自动派出下一只可用伙伴
- 全队无法继续战斗后才撤退
- 动态捕捉概率：目标 HP 越低，连接成功率越高
- 特殊任务战支持独立标题、副标题、奖励、胜利 flag 和捕捉限制
- 战斗内正式物品菜单：
  - 星辉恢复剂
  - 星能补充剂
  - 捕捉胶囊
- 恢复 / PP 道具在战斗中会消耗玩家行动机会，对手随后可以行动

### 背包、编组与图鉴

- **探索背包 `BagScene`**
  - 可点击或 A/D、左右键选择任意队伍成员
  - 星辉恢复剂：恢复约 45% HP 并清除异常
  - 星能补充剂：恢复所选星灵四技能约 50% PP
  - 普通恢复剂不能复活 0 HP 星灵
- **伙伴编组 `RosterScene`**
  - 队伍 ↔ 仓库双向调配
  - 设置队首
  - 队伍最多 4 只
- **星灵手册 `FieldGuideScene`**
  - 已发现 / 未发现记录
  - 基础能力、属性、技能、PP、异常效果与成长路线

### 星港设施与经济

- 恢复中心：全队 HP / 异常 / PP 恢复
- 研究站补给：
  - 捕捉胶囊
  - 星辉恢复剂
  - 星能补充剂
- 训练场：消耗星币获得 EXP，并走同一套升级 / 成长 / 技能学习规则
- 战斗、调查与任务产生星币，形成基础补给经济循环

## 操作

### 通用探索

- `WASD` / 方向键：移动
- `E`：交互
- `B`：背包
- `L`：处理队首待学习技能
- `H`：野外快速使用星辉恢复剂（支持的探索区）
- `Esc`：返回上一区域 / 关闭当前界面

### 星港

- `G`：星灵手册
- `T`：伙伴编组
- `P`：队伍 / 仓库快览
- `R`：开发期测试遭遇
- `E`：设施、仓库、星门交互

### 背包

- 点击成员卡片：选择道具目标
- `A` / `D` 或左右键：切换队伍目标
- `1`：使用星辉恢复剂
- `2`：使用星能补充剂
- `B` / `Esc`：返回

### 对话

- `E` / `Space`：继续

### 战斗

- `1`–`4`：使用技能
- `Q`：更换伙伴
- `I`：战斗物品菜单
- `H`：快速使用星辉恢复剂
- `C`：尝试捕捉（特殊任务战可能禁止）
- `Esc`：关闭浮层或返回战斗前区域

## 技术栈

- TypeScript
- Phaser 4.2.1
- Vite 8
- Vitest 4
- Tiled Object Map JSON
- Browser LocalStorage
- GitHub Actions

## 从零启动开发分支

```bash
git clone https://github.com/devotionn/Aola-Reborn.git
cd Aola-Reborn
git switch agent/bootstrap-playable-mvp
npm install
npm run dev
```

如果已经 clone：

```bash
git fetch origin
git switch agent/bootstrap-playable-mvp
git pull --ff-only
npm install
npm run dev
```

## 验证

```bash
npm run typecheck
npm test
npm run build
npm run preview
```

生产构建当前会执行：

```text
vitest run → tsc --noEmit → vite build
```

GitHub Actions 会在 push / pull request 时自动安装依赖、执行 TypeScript typecheck，并运行包含规则测试的 production build。

当前回归测试已经覆盖包括：

- 初始伙伴成长触发
- 林地独占星灵成长触发
- 等级技能进入待学习队列
- 四技能槽替换
- 属性克制基本关系
- 动态捕捉概率边界
- PP 初始化、消耗、恢复和耗尽保护
- 玩家 / NPC PP 全空后的余辉震荡
- 灼热 / 迟缓规则
- 非队首成员定向 PP 恢复
- 普通恢复剂不能复活 0 HP 星灵

## 代码结构

```text
src/game/
├─ data/       # 星灵、技能、属性、成长与学习表
├─ maps/       # Tiled Object Map JSON
├─ scenes/     # 主城、三探索区、战斗、背包、手册、编组、设施、技能学习
├─ state/      # LocalStorage 存档与旧存档归一化
├─ systems/    # 战斗、成长、PP、道具、地图对象规则 + Vitest
├─ ui/         # 可复用对话等 UI 组件
├─ config.ts
└─ types.ts
```

## 里程碑文档

- `docs/V0.5_WORLD_LAYER.md`
- `docs/V0.6_BATTLE_DEPTH_AND_MAP_UNIFICATION.md`
- `docs/V0.7_PROGRESSION_AND_INVENTORY.md`
- `docs/V0.8_MIST_INVESTIGATION_AND_BATTLE_ITEMS.md`

## 开发纪律

当前阶段每一轮尽量保持以下闭环：

```text
业务 / 玩法目标
  ↓
数据与规则层
  ↓
场景 / UI 接入
  ↓
Vitest 回归
  ↓
TypeScript strict mode
  ↓
Vite production build
  ↓
README / milestone / PR 同步
```

不要把“计划做”“写了半个入口”“README 先写了”算成已经完成的功能。

## 下一阶段建议：v0.9 视觉化与生产化

v0.8 以后不建议立刻继续横向堆第四、第五张地图。优先把现有纵切从“完整程序原型”推进到“真正像一款游戏”：

1. 确定原创正式游戏名、Logo 与视觉规范。
2. 为星港 + 三张区域接入正式原创 tileset / tile layer。
3. 制作第一批原创星灵立绘、NPC 头像与玩家角色。
4. 增加战斗背景、入场动画、技能 VFX、受击反馈。
5. 建立音频管理层并接入原创 UI / 环境 / 战斗声音。
6. 增加 Playwright 冒烟流程：选初始 → 第一任务 → 战斗 → 捕捉 → 背包。
7. 对 Phaser 与场景做 lazy loading / bundle splitting。
8. 在继续扩大永久存档字段前，引入正式 save schema migration 版本体系。

## 已知边界

- 当前地图仍主要使用程序化几何占位表现，尚未接生产 tileset。
- 当前没有正式星灵立绘、NPC 美术、玩家角色、技能动画和音频资产。
- 战斗物品菜单目前作用于当前上场星灵；探索背包才支持任意队伍目标。
- 尚无复活道具。
- 状态系统目前只有灼热 / 迟缓。
- 尚无物理 / 特殊 / 状态招式分类、能力等级、天气、场地、暴击等完整战斗层。
- 尚未加入 Playwright 浏览器流程测试。
- Phaser 仍位于较大的主 bundle 中，Vite 会给出 >500 kB chunk warning。
- 当前仍主要依赖 LocalStorage；账号、云存档、好友、多人功能尚未进入实现阶段。

## 分支与合并策略

- `main` 保持稳定项目入口，不因为“看起来空”就提前合入未经阶段验收的开发代码。
- 当前开发通过 `agent/bootstrap-playable-mvp` + Draft PR #1 持续推进。
- 适合进入稳定基线时，再根据提交历史和可维护性决定 merge / squash，而不是机械保留全部实验提交。
- 合并前至少要求：CI 绿色、README 与实际一致、关键玩法人工浏览器验证通过、已知问题有记录。

## IP Notice

仓库名中的 `Aola` 仅作为开发阶段代号。项目不应直接复制原作角色、地图、剧情、音乐、美术或其他受保护资产。公开发行或商业化时应使用原创品牌和原创资产，并完成许可证、版权和商标层面的正式整理。
