# Aola-Reborn

一个面向 PC 浏览器的原创怀旧宠物收集 RPG 项目。目标是复现 2010 年代网页宠物养成游戏的探索、收集、回合战斗和长期养成节奏，同时使用原创名称、原创数据、原创世界观，并逐步替换为自有美术与音频资产。

> **重要说明**：`Aola` 目前仅作为开发仓库代号。公开发行或商业化版本应更换为原创品牌名，并完成名称、美术、音乐、角色、地图、剧情与商标审查。项目不应直接复制既有商业游戏的角色、地图、剧情、音乐、美术或其他受保护资产。

## 仓库状态

当前仓库只有两个分支：

| 分支 | 角色 | 状态 |
| --- | --- | --- |
| `main` | 项目门户 / 稳定基线 | 当前仅维护项目说明，尚未合入可玩代码 |
| `agent/bootstrap-playable-mvp` | 当前实际开发分支 | 已推进到可玩 **v0.8**，Draft PR #1 持续更新 |

当前可玩实现位于：

- 开发分支：[`agent/bootstrap-playable-mvp`](https://github.com/devotionn/Aola-Reborn/tree/agent/bootstrap-playable-mvp)
- Draft PR：[#1 build playable v0.8 mist investigation and battle items](https://github.com/devotionn/Aola-Reborn/pull/1)

**不要直接从当前 `main` 判断项目功能是否缺失。** 在 PR #1 合并前，`main` 主要承担项目入口与状态说明作用。

## 当前开发里程碑：v0.8

开发分支已经形成一条完整的单机宠物 RPG 纵切：

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
PP / 异常状态 / 换宠 / 背包 / 战斗物品
  ↓
特殊挑战 / 调查奖励 / 经济循环
```

### 已实现内容概览

- **1 个主城**：星港
- **3 个探索区**：星落原野、烬苔林地、雾镜湿地
- 三张野外图统一使用 Tiled Object Map JSON，并复用 `Barriers` / `EncounterZones` / `Points` 协议
- 实体碰撞、区域随机遭遇、NPC、任务点、双向传送
- **3 条持久化调查任务线**
- **15 种原创星灵形态**
- **6 种属性**：火 / 水 / 木 / 电 / 岩 / 星
- **22 个技能配置**
- 每只星灵独立四技能栏、独立 PP、等级学习表和待学习技能队列
- 数据驱动成长 / 进化
- HP 回合战斗、命中、速度先后手、属性倍率、换宠、动态捕捉概率
- 当前异常状态：灼热 / 迟缓
- 玩家与 NPC PP 全耗尽时使用 **余辉震荡**，避免战斗死锁
- 探索背包、任意队伍成员定向使用恢复剂 / PP 补充剂
- 战斗内物品菜单、快速恢复、捕捉胶囊
- 队伍 / 仓库双向编组
- 星灵手册 / 图鉴
- 星港恢复中心、研究站补给、训练场、基础星币经济循环
- Browser LocalStorage 本地存档，并兼容早期存档字段归一化
- Vitest + TypeScript strict mode + Vite production build + GitHub Actions CI

## 当前主要成长链

```text
炽尾团子 Lv.10 → 曜焰灵
澜鳍兽   Lv.10 → 沧澜兽
森芽狸   Lv.10 → 森冠狸
苔灯蛾   Lv.14 → 森灯羽
晶露蜗   Lv.14 → 月晶螺
```

当前三条调查主线的代表角色 / 特殊对局：

```text
研究员 · 岚音 → 曜角鹿
巡林员 · 柏舟 → 共鸣岩壳龟
观测员 · 汐遥 → 镜雾鹭
```

## 如何运行当前可玩版本

当前 `main` 尚未包含游戏源码，请切换到开发分支：

```bash
git clone https://github.com/devotionn/Aola-Reborn.git
cd Aola-Reborn
git switch agent/bootstrap-playable-mvp
npm install
npm run dev
```

工程验证：

```bash
npm run typecheck
npm test
npm run build
npm run preview
```

当前 production build 会执行：

```text
vitest run → tsc --noEmit → vite build
```

最新 v0.8 开发 head 已通过 GitHub Actions 的 Install / Typecheck / Build 流程。

## 技术栈

- TypeScript
- Phaser 4.2.1
- Vite 8
- Vitest 4
- Tiled Object Map JSON
- Browser LocalStorage
- GitHub Actions

## 开发分支操作摘要

### 通用探索

- `WASD` / 方向键：移动
- `E`：交互
- `B`：背包
- `L`：处理待学习技能
- `H`：快速使用星辉恢复剂
- `Esc`：返回 / 关闭当前界面

### 星港

- `G`：星灵手册
- `T`：伙伴编组
- `P`：队伍 / 仓库快览
- `R`：开发期测试遭遇

### 战斗

- `1`–`4`：技能
- `Q`：更换伙伴
- `I`：战斗物品
- `H`：快速恢复剂
- `C`：捕捉
- `Esc`：关闭浮层 / 返回进入战斗前的区域

完整操作、实现细节、已知边界和里程碑文档请查看开发分支 README。

## 里程碑记录

开发分支中已记录：

- `docs/V0.5_WORLD_LAYER.md`
- `docs/V0.6_BATTLE_DEPTH_AND_MAP_UNIFICATION.md`
- `docs/V0.7_PROGRESSION_AND_INVENTORY.md`
- `docs/V0.8_MIST_INVESTIGATION_AND_BATTLE_ITEMS.md`

## 下一阶段：v0.9

v0.8 后暂时不优先横向堆更多地图，重点进入**视觉化与生产化**：

1. 确定原创正式游戏名、Logo 与视觉规范。
2. 为星港和三张现有区域接入正式原创 tileset / tile layer。
3. 制作第一批原创星灵立绘、NPC 头像和玩家角色。
4. 增加战斗背景、入场动画、技能 VFX 与更明确的受击反馈。
5. 建立音频管理层，接入原创 UI / 环境 / 战斗音频。
6. 增加 Playwright 冒烟流程测试。
7. 做场景 lazy loading / bundle splitting，处理 Phaser 主 bundle 过大的问题。
8. 在继续扩大永久存档字段前，引入正式 save schema migration 体系。

## 当前已知边界

- 地图仍主要是程序化几何占位表现，尚未接正式生产 tileset。
- 尚无正式星灵立绘、NPC 美术、玩家角色、技能动画和音频资产。
- 战斗物品目前作用于当前上场星灵；探索背包支持任意队员目标。
- 尚无复活道具。
- 状态系统目前只有灼热 / 迟缓。
- 尚无完整的物理 / 特殊 / 状态招式分类、能力等级、天气、场地和暴击模型。
- 尚未加入 Playwright 浏览器流程测试。
- Phaser 仍位于较大的主 bundle 中，Vite 会产生 >500 kB chunk warning。

## 分支策略

在当前阶段：

- `main`：保持清晰的项目入口与稳定基线，不在未验证情况下直接堆开发提交。
- `agent/bootstrap-playable-mvp`：承载连续可玩纵切开发，并由 Draft PR #1 汇总。
- 每个阶段优先保证：**实际代码 → 规则测试 → TypeScript → production build → 文档** 同步闭环。

当 v0.x 纵切达到适合稳定发布的节点，再评估将开发分支 squash / merge 到 `main`，而不是为了“看起来有代码”提前合并。

## License / IP Notice

当前仓库用于原创技术原型与游戏设计验证。仓库名中的 `Aola` 只是开发阶段代号，不代表获得任何第三方品牌授权。未来公开发布前应完成原创品牌、版权资产、许可证和商标层面的正式整理。
