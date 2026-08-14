import Phaser from 'phaser';
import { moves } from '../data/moves';
import { species } from '../data/species';
import { loadSave, writeSave } from '../state/save';
import { moveIdsFor, replaceMove } from '../systems/BattleSystem';
import type { CreatureInstance, PlayerSave, SceneKey } from '../types';

interface MoveLearnSceneData {
  creatureUid?: string;
  returnScene?: SceneKey;
}

export class MoveLearnScene extends Phaser.Scene {
  private save!: PlayerSave;
  private creature!: CreatureInstance;
  private returnScene: SceneKey = 'world';
  private content?: Phaser.GameObjects.Container;
  private statusText!: Phaser.GameObjects.Text;

  constructor() { super('moveLearn'); }

  create(data: MoveLearnSceneData = {}): void {
    const save = loadSave();
    if (!save) { this.scene.start('starter'); return; }
    this.save = save;
    this.returnScene = data.returnScene ?? 'world';
    const all = [...save.party, ...save.collection];
    this.creature = all.find((item) => item.uid === data.creatureUid) ?? save.party[0];
    this.creature.pendingMoveIds ??= [];

    this.cameras.main.setBackgroundColor('#111831');
    this.add.text(64, 42, '技能学习', { fontSize: '34px', fontStyle: 'bold', color: '#ffffff' });
    this.add.text(1210, 58, 'ESC · 稍后处理', { fontSize: '14px', color: '#c8d8f4' }).setOrigin(1, 0.5);
    this.statusText = this.add.text(640, 652, '', {
      fontSize: '15px', color: '#ffffff', backgroundColor: '#0a1128dd', padding: { x: 16, y: 10 }, wordWrap: { width: 1000 }, align: 'center',
    }).setOrigin(0.5);

    this.input.keyboard?.on('keydown-ONE', () => this.replaceSlot(0));
    this.input.keyboard?.on('keydown-TWO', () => this.replaceSlot(1));
    this.input.keyboard?.on('keydown-THREE', () => this.replaceSlot(2));
    this.input.keyboard?.on('keydown-FOUR', () => this.replaceSlot(3));
    this.input.keyboard?.on('keydown-ESC', () => this.leave());
    this.render();
  }

  private render(): void {
    this.content?.destroy(true);
    const root = this.add.container(0, 0);
    const data = species[this.creature.speciesId];
    const pending = this.creature.pendingMoveIds?.[0];

    root.add(this.add.text(640, 105, `${data.symbol} ${data.name} · Lv.${this.creature.level}`, { fontSize: '25px', fontStyle: 'bold', color: '#ffe59b' }).setOrigin(0.5));
    if (!pending || !moves[pending]) {
      root.add(this.add.text(640, 320, '当前没有等待学习的新技能。', { fontSize: '25px', color: '#a9c8ee' }).setOrigin(0.5));
      root.add(this.add.text(640, 370, '升级或训练达到技能学习等级后，新技能会出现在这里。', { fontSize: '15px', color: '#8097ba' }).setOrigin(0.5));
      this.statusText.setText('ESC 返回探索区域。');
      this.content = root;
      return;
    }

    const candidate = moves[pending];
    root.add(this.add.rectangle(640, 185, 900, 110, 0x263e67, 0.98).setStrokeStyle(2, 0xffd875));
    root.add(this.add.text(640, 160, `新技能：${candidate.name} · ${this.elementName(candidate.element)} · 威力 ${candidate.rating} · PP ${candidate.pp}`, {
      fontSize: '20px', fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(0.5));
    const condition = candidate.condition ? ` · ${Math.round(candidate.condition.chance * 100)}% ${candidate.condition.type === 'scorch' ? '灼热' : '迟缓'}` : '';
    root.add(this.add.text(640, 200, `${candidate.description}${condition}`, { fontSize: '14px', color: '#c9dcf4' }).setOrigin(0.5));

    root.add(this.add.text(640, 265, '技能栏已满。选择 1–4 中的一招替换：', { fontSize: '18px', color: '#dbe8ff' }).setOrigin(0.5));
    moveIdsFor(this.creature).forEach((moveId, index) => {
      const move = moves[moveId];
      const x = 330 + (index % 2) * 620;
      const y = 365 + Math.floor(index / 2) * 155;
      const card = this.add.rectangle(x, y, 520, 120, 0x1c3159, 0.98).setStrokeStyle(2, 0x5f83b8).setInteractive({ useHandCursor: true });
      card.on('pointerover', () => card.setFillStyle(0x294a7a));
      card.on('pointerout', () => card.setFillStyle(0x1c3159));
      card.on('pointerdown', () => this.replaceSlot(index));
      root.add(card);
      root.add(this.add.text(x, y - 28, `${index + 1}. ${move.name} · ${this.elementName(move.element)} · ${move.rating}`, { fontSize: '18px', fontStyle: 'bold', color: '#ffffff' }).setOrigin(0.5));
      root.add(this.add.text(x, y + 15, `PP ${move.pp} · ${move.description}`, { fontSize: '13px', color: '#b9cbe4', wordWrap: { width: 450 }, align: 'center' }).setOrigin(0.5));
    });
    this.statusText.setText('点击技能卡或按 1–4 完成替换；ESC 可以暂时保留待学习技能。');
    this.content = root;
  }

  private replaceSlot(slot: number): void {
    const pending = this.creature.pendingMoveIds?.[0];
    if (!pending) return;
    const oldMoveId = moveIdsFor(this.creature)[slot];
    if (!oldMoveId) return;
    if (!replaceMove(this.creature, slot, pending)) {
      this.statusText.setText('技能替换失败，请选择其他技能位。');
      return;
    }
    writeSave(this.save);
    this.statusText.setText(`已忘记 ${moves[oldMoveId].name}，学会 ${moves[pending].name}！`);
    this.render();
  }

  private elementName(element: string): string {
    return ({ fire: '火系', water: '水系', nature: '木系', electric: '电系', rock: '岩系', neutral: '星系' } as Record<string, string>)[element] ?? element;
  }

  private leave(): void {
    writeSave(this.save);
    this.scene.start(this.returnScene);
  }
}