# Aola-Reborn

一个面向 PC 浏览器的怀旧宠物收集 RPG 原型。项目当前仅使用原创名称、原创数据和几何占位视觉。

## v0.1

当前已经形成完整的最小可玩闭环：

- 三选一初始伙伴
- 星港广场探索
- WASD / 方向键移动
- 草地区域随机遭遇，R 可强制触发
- 6 种原创星灵、6 种属性、10 个技能配置
- 属性关系、速度顺序与共鸣效果值
- 捕捉胶囊、四人队伍与仓库数据
- 经验、升级、本地存档与地图位置保存

### 操作

初始伙伴：`1` / `2` / `3`

星港广场：`WASD` / 方向键移动，`R` 触发测试遭遇。

遭遇场景：`1` / `2` / `3` 使用技能，`C` 在共鸣足够后收集伙伴，`Esc` 返回广场。

## 技术栈

- TypeScript
- Phaser 4.2.1
- Vite 8
- Browser LocalStorage

## 启动

```bash
npm install
npm run dev
```

```bash
npm run typecheck
npm run build
npm run preview
```

## 结构

```text
src/game/
├─ data/       # 星灵、技能、属性配置
├─ scenes/     # Boot / Starter / World / Battle
├─ state/      # 本地存档
├─ systems/    # 遭遇与成长规则
├─ config.ts
└─ types.ts
```

## 下一阶段

1. 完整 HP 与技能状态机、命中、效果浮动、换宠和道具。
2. Tiled 多地图、碰撞、NPC、传送点与交互区域。
3. 技能学习、进化、图鉴、仓库与恢复 UI。
4. NPC 任务、Boss、商店、训练场和研究站。
5. 原创角色、星灵、地图与动画资产。
6. Vitest、Playwright 与 GitHub Actions 自动验证。
7. 单机核心稳定后再评估账号、云存档、好友和多人功能。

## IP Notice

仓库名中的 `Aola` 仅作为开发阶段代号。若公开发行或商业化，应更换为原创品牌名，并完成名称、美术、音乐、角色设计和商标审查。
