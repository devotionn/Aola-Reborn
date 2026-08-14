import Phaser from 'phaser';
import { moves } from '../data/moves';
import { species } from '../data/species';
import { loadSave } from '../state/save';
import type { ConditionType, ElementType } from '../types';

export class FieldGuideScene extends Phaser.Scene {
  private ids: string[] = [];
  private known = new Set<string>();
  private selected = 0;
  private content?: Phaser.GameObjects.Container;

  constructor() { super('guide'); }

  create(): void {
    const save = loadSave();
    if (!save) { this.scene.start('starter'); return; }

    this.ids = Object.keys(species);
    this.known = new Set(save.discoveredSpecies);
    const firstKnown = this.ids.findIndex((id) => this.known.has(id));
    this.selected = Math.max(0, firstKnown);

    this.cameras.main.setBackgroundColor('#101a38');
    this.add.text(64, 42, '星灵手册', { fontSize: '34px', fontStyle: 'bold', color: '#ffffff' });
    this.add.text(64, 86, `已记录 ${this.known.size} / ${this.ids.length}`, { fontSize: '15px', color: '#9fc4ef' });
    this.add.text(1210, 56, 'G / ESC 返回星港', { fontSize: '14px', color: '#c8d8f4' }).setOrigin(1, 0.5);

    const keyboard = this.input.keyboard;
    keyboard?.on('keydown-UP', () => this.moveSelection(-1));
    keyboard?.on('keydown-DOWN', () => this.moveSelection(1));
    keyboard?.on('keydown-W', () => this.moveSelection(-1));
    keyboard?.on('keydown-S', () => this.moveSelection(1));
    keyboard?.on('keydown-G', () => this.scene.start('world'));
    keyboard?.on('keydown-ESC', () => this.scene.start('world'));

    this.render();
  }

  private moveSelection(step: number): void {
    this.selected = Phaser.Math.Wrap(this.selected + step, 0, this.ids.length);
    this.render();
  }

  private render(): void {
    this.content?.destroy(true);
    const root = this.add.container(0, 0);

    root.add(this.add.rectangle(220, 390, 330, 560, 0x162445, 0.98).setStrokeStyle(2, 0x526e9f));
    this.ids.forEach((id, index) => {
      const discovered = this.known.has(id);
      const data = species[id];
      const y = 132 + index * 49;
      const row = this.add.rectangle(220, y, 288, 40, index === this.selected ? 0x345d93 : 0x1c3159, 1)
        .setStrokeStyle(1, index === this.selected ? 0xffdd82 : 0x42638f)
        .setInteractive({ useHandCursor: true });
      row.on('pointerdown', () => { this.selected = index; this.render(); });
      root.add(row);
      root.add(this.add.text(92, y - 10, `${String(index + 1).padStart(2, '0')}  ${discovered ? `${data.symbol} ${data.name}` : '??? 未记录'}`, {
        fontSize: '15px', color: discovered ? '#eef5ff' : '#7083a4',
      }));
    });

    root.add(this.add.rectangle(810, 390, 760, 560, 0x0c1530, 0.98).setStrokeStyle(2, 0x526e9f));
    const id = this.ids[this.selected];
    if (!this.known.has(id)) {
      root.add(this.add.text(810, 340, '?', { fontSize: '108px', fontStyle: 'bold', color: '#40506e' }).setOrigin(0.5));
      root.add(this.add.text(810, 455, '尚未记录这只星灵\n在探索、任务或成长中与它相遇后会解锁资料。', {
        fontSize: '20px', color: '#8499bc', align: 'center', lineSpacing: 10,
      }).setOrigin(0.5));
      this.content = root;
      return;
    }

    const data = species[id];
    root.add(this.add.circle(575, 245, 82, 0x2d4e7f).setStrokeStyle(4, 0xb8ddff));
    root.add(this.add.text(575, 245, data.symbol, { fontSize: '54px', fontStyle: 'bold', color: '#ffffff' }).setOrigin(0.5));
    root.add(this.add.text(700, 170, data.name, { fontSize: '32px', fontStyle: 'bold', color: '#ffffff' }));
    root.add(this.add.text(700, 216, `${this.elementName(data.element)} · 基础记录`, { fontSize: '16px', color: '#9fe5c8' }));
    root.add(this.add.text(700, 254, data.description, { fontSize: '17px', color: '#c9d9ef', wordWrap: { width: 520 } }));

    root.add(this.add.text(505, 350, '基础能力', { fontSize: '19px', fontStyle: 'bold', color: '#ffe59b' }));
    root.add(this.add.text(505, 388, `体力 ${data.baseStats.hp}    星能 ${data.baseStats.spirit}    专注 ${data.baseStats.focus}    速度 ${data.baseStats.speed}`, {
      fontSize: '16px', color: '#dbe8ff',
    }));

    root.add(this.add.text(505, 452, '技能记录', { fontSize: '19px', fontStyle: 'bold', color: '#ffe59b' }));
    data.moveIds.slice(0, 4).forEach((moveId, index) => {
      const move = moves[moveId];
      const condition = move.condition
        ? ` · ${Math.round(move.condition.chance * 100)}% ${this.conditionName(move.condition.type)}`
        : '';
      root.add(this.add.text(505 + (index % 2) * 300, 490 + Math.floor(index / 2) * 62,
        `${move.name} · ${this.elementName(move.element)} · 威力 ${move.rating} · PP ${move.pp}\n${move.description}${condition}`,
        { fontSize: '13px', color: '#d5e5fb', lineSpacing: 3, wordWrap: { width: 280 } }));
    });

    const growth = data.growth;
    const growthText = growth
      ? `成长：Lv.${growth.level} → ${species[growth.targetSpeciesId].name}`
      : '成长：当前未记录后续形态';
    root.add(this.add.text(505, 625, growthText, { fontSize: '15px', color: growth ? '#9fe5c8' : '#8195b5' }));
    this.content = root;
  }

  private conditionName(condition: ConditionType): string {
    return condition === 'scorch' ? '灼热' : '迟缓';
  }

  private elementName(element: ElementType): string {
    return { fire: '火系', water: '水系', nature: '木系', electric: '电系', rock: '岩系', neutral: '星系' }[element];
  }
}
